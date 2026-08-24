import type { UIMessage } from 'ai';
import { generateText } from 'ai';
import { z } from 'zod';

import {
  type ChatProvider,
  type ModelTier,
  getModelId,
} from '@/features/chat/server/providers/config';
import { getChatProviderRuntimeFor } from '@/features/chat/server/providers/resolve';

export type { ModelTier };

// ---- fast-path 阈值 ----

/** 极短消息 fast-path 上限（字符数），符合条件直接 mini，跳过 LLM */
const FAST_MINI_MAX_LENGTH = 8;
/** 极长消息 fast-path 下限（字符数），符合条件直接 pro，跳过 LLM */
const FAST_PRO_MIN_LENGTH = 200;
/** LLM 分类为 simple 后，≤该长度降级到 mini；超过则用 lite */
const SIMPLE_TO_MINI_MAX_LENGTH = 20;
/** 会话 user 消息数 ≥ 该值时禁止降级到 mini，防止"继续/嗯"丢上下文 */
const KEEP_LITE_MIN_TURNS = 4;

// ---- LLM 分类器常量 ----

/** 分类上下文：最近消息条数上限 */
const CLASSIFIER_CONTEXT_MESSAGES = 6;
/** 分类上下文：总字符上限，控制 token 与延迟 */
const CLASSIFIER_CONTEXT_MAX_CHARS = 500;

/** 复杂度分类 instructions —— 只输出 JSON，不做解释 */
const CLASSIFIER_INSTRUCTIONS = `你是查询复杂度分类器。分析用户消息，只输出一个 JSON 对象，不要任何其他文字、解释或代码块。
字段 tier 取值：
- pro：涉及编程、算法、数学、长文写作、多步推理、深度分析、复杂调试
- simple：简单问候、闲聊、确认、短事实问答（无需推理/代码/分析/创作）
不确定时选 pro。
输出格式：{"tier":"pro"} 或 {"tier":"simple"}`;

/** 分类结果 zod schema（v4） */
const classifierTierSchema = z.object({
  tier: z.enum(['pro', 'simple']),
});

// ---- 工具函数 ----

/** 抽取 UIMessage 文本内容（text part 拼接） */
function getPartsText(message: UIMessage): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && 'text' in part && typeof part.text === 'string')
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

/** 取最后一条 user 消息的文本；无文本时返回空串 */
function getLastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'user') {
      const text = getPartsText(messages[i]).trim();
      if (text) return text;
    }
  }
  return '';
}

/** 检测是否包含代码/技术符号（用于 fast-path：极短消息若含代码符号仍需走 LLM） */
function hasCodeSymbols(text: string): boolean {
  return /[`{}\[\]();=]|```|import |export |function |const |def |class /.test(text);
}

/** 提取首个 JSON 对象（容错 markdown 代码块与前后缀文字） */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

/** 组装分类上下文：取最近若干条 user/assistant 文本，截断超长历史 */
function buildClassifierPrompt(messages: UIMessage[]): string {
  const lines: string[] = [];
  let total = 0;
  // 不包含最后一条（即当前用户消息），只取之前的上下文
  const end = messages.length - 1;
  const start = Math.max(0, end - CLASSIFIER_CONTEXT_MESSAGES);

  for (let i = start; i < end; i++) {
    const message = messages[i];
    if (!message || (message.role !== 'user' && message.role !== 'assistant')) continue;
    const text = getPartsText(message).trim();
    if (!text) continue;
    const label = message.role === 'user' ? '用户' : '助手';
    const line = `${label}：${text}`;
    if (total + line.length > CLASSIFIER_CONTEXT_MAX_CHARS) {
      lines.unshift('……（省略更早对话）');
      break;
    }
    lines.push(line);
    total += line.length;
  }

  if (lines.length === 0) return '无历史对话。';

  return `对话上下文：\n${lines.join('\n')}`;
}

// ---- LLM 分类器 ----

/**
 * 用模型做复杂度二分类（pro vs simple）。
 * 失败（网络/超时/解析异常）返回 null，由调用方回退 lite。
 */
async function classifyWithLLM(
  text: string,
  messages: UIMessage[],
  provider: ChatProvider,
): Promise<'pro' | 'simple' | null> {
  try {
    const context = buildClassifierPrompt(messages);
    const prompt = `${context}\n\n用户最新消息：\n${text}\n\n请判断复杂度。`;

    const client = getChatProviderRuntimeFor(provider).getClient();
    const classifierModel = client.chat(getModelId(provider, 'mini'));

    const result = await generateText({
      // 修复：方舟 Responses API 非流式响应缺 annotations 字段 → schema 校验失败；
      // 改用 Chat Completions API，schema 更宽松，所有模型均支持
      model: classifierModel,
      // 修复：AI SDK v7 使用 instructions 而非已废弃的 system
      instructions: CLASSIFIER_INSTRUCTIONS,
      prompt,
      temperature: 0,
      maxOutputTokens: 64,
    });

    const raw = extractJsonObject(result.text);
    if (!raw) return null;

    const parsed = classifierTierSchema.safeParse(JSON.parse(raw) as unknown);
    return parsed.success ? (parsed.data.tier === 'pro' ? 'pro' : 'simple') : null;
  } catch (error) {
    // 分类失败不阻塞主回复，回退 lite
    console.error('[select-model] LLM 分类失败，回退 lite', error);
    return null;
  }
}

// ---- 主入口 ----

/**
 * 按场景复杂度自动选择模型 ID（逐轮路由，基于最后一条 user 消息）。
 *
 * 决策流程：
 * 1. 空文本 → lite
 * 2. 极短(≤8字)且无代码符号 → mini（fast-path，省 API 调用）
 * 3. 极长(≥200字) → pro（fast-path）
 * 4. 其余 → mini 模型 LLM 二分类（pro/simple）；失败回退 lite
 *    - pro → 使用 pro 模型
 *    - simple → ≤20字用 mini，>20字用 lite
 * 5. 多轮 guard：userTurn ≥ 4 且结果为 mini → 升级到 lite（防止"继续/嗯"丢上下文）
 */
export async function selectModel(
  messages: UIMessage[],
  provider: ChatProvider = 'deepseek',
): Promise<{ modelId: string; tier: ModelTier }> {
  const lastUserText = getLastUserText(messages);
  const userTurnCount = messages.reduce((count, m) => (m.role === 'user' ? count + 1 : count), 0);

  let tier: ModelTier;

  if (!lastUserText) {
    tier = 'lite';
  } else if (lastUserText.length <= FAST_MINI_MAX_LENGTH && !hasCodeSymbols(lastUserText)) {
    // 修复：极短消息直接 mini，跳过 LLM 省一次 API 调用
    tier = 'mini';
  } else if (lastUserText.length >= FAST_PRO_MIN_LENGTH) {
    // 修复：极长消息大概率复杂，跳过 LLM 省一次 API 调用
    tier = 'pro';
  } else {
    // 修复：LLM 语义分类替代关键词匹配，理解隐含复杂度
    const llmResult = await classifyWithLLM(lastUserText, messages, provider);
    if (llmResult === 'pro') {
      tier = 'pro';
    } else if (llmResult === 'simple') {
      tier = lastUserText.length <= SIMPLE_TO_MINI_MAX_LENGTH ? 'mini' : 'lite';
    } else {
      // LLM 分类失败 → lite（安全回退）
      tier = 'lite';
    }
  }

  // 修复：多轮会话里短追问若掉到 mini，可能因上下文过长而丢前文
  if (userTurnCount >= KEEP_LITE_MIN_TURNS && tier === 'mini') {
    tier = 'lite';
  }

  return { modelId: getModelId(provider, tier), tier };
}
