import 'server-only';

import { generateText } from 'ai';

import {
  getChatProvider,
  getModelId,
  getTitleReasoningEffort,
} from '@/features/chat/server/providers/config';
import { getChatProviderRuntimeFor } from '@/features/chat/server/providers/resolve';
import { getLlmTitleSource } from '@/features/chat/title';

/** 送入标题模型的用户文本上限，控制 token；标题本身不按此截断 */
const TITLE_PROMPT_MAX_CHARS = 500;
/** 中文标题硬上限（字）；与 instructions 共用，清洗强制执行 */
const TITLE_MAX_CJK_CHARS = 20;
/** 英文标题硬上限（词） */
const TITLE_MAX_EN_WORDS = 8;

const TITLE_INSTRUCTIONS = `你是会话列表的标题生成器。根据用户消息概括主题，输出一个短标题。
硬性规则：
- 只输出标题，不要解释、不要引号、不要「标题：」前缀
- 技能名与用户正文是同一条消息，必须整体概括
- 标题必须体现用户正文里的具体对象（品牌、产品、主题），禁止只把技能名改写成标题
- 必须用自己的话概括，禁止抄写或续写用户原文开头
- 技能用中文名（不要 /id）
- 中文不得超过 ${TITLE_MAX_CJK_CHARS} 个字，英文不得超过 ${TITLE_MAX_EN_WORDS} 个单词`;

const BREAK_CHARS = ['，', '。', '、', ' ', '·', '-', '/', '：', ':'];
const CJK_RE = /[\u3400-\u9fff\uF900-\uFAFF]/;
const MIN_BREAK_INDEX = 4;

/**
 * 按中文 20 字 / 英文 8 词硬截；优先在标点或空白处断开。
 */
function clampTitleLength(text: string): string {
  if (CJK_RE.test(text)) {
    if (text.length <= TITLE_MAX_CJK_CHARS) return text;
    const window = text.slice(0, TITLE_MAX_CJK_CHARS);
    const breakIdx = Math.max(...BREAK_CHARS.map((char) => window.lastIndexOf(char)));
    return (breakIdx >= MIN_BREAK_INDEX ? window.slice(0, breakIdx) : window).trim();
  }

  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= TITLE_MAX_EN_WORDS) return text;
  return words.slice(0, TITLE_MAX_EN_WORDS).join(' ');
}

/**
 * 模型若只是复述原文开头，不能当标题。
 */
function isCopiedPrefix(title: string, source: string): boolean {
  const compactTitle = title.replace(/\s+/g, '');
  const compactSource = source.replace(/\s+/g, '');
  if (!compactTitle || compactTitle.length < 4) return false;
  return compactSource.startsWith(compactTitle) || source.startsWith(title);
}

const TOPIC_QUOTE_RE = /[「『""]([^」』""]{2,24})[」』""]/g;

/** 正文里有书名号专名，但标题一个都没用上——视为只复述了技能。 */
function missesQuotedTopic(title: string, source: string): boolean {
  const names = [...source.matchAll(TOPIC_QUOTE_RE)].map((match) => match[1]);
  if (names.length === 0) return false;
  return names.every((name) => !title.includes(name));
}

function isWeakTitle(title: string | undefined, source: string): boolean {
  if (!title) return true;
  return isCopiedPrefix(title, source) || missesQuotedTopic(title, source);
}

function buildTitlePrompt(source: string): string {
  const clipped =
    source.length > TITLE_PROMPT_MAX_CHARS ? source.slice(0, TITLE_PROMPT_MAX_CHARS) : source;
  return `请为下面的用户消息生成会话标题（只输出标题）：\n\n${clipped}`;
}

/**
 * 清洗模型标题：去引号与「标题：」前缀、去句末标点，并强制字数上限。
 */
function sanitizeTitle(raw: string): string | undefined {
  let text = raw.trim();
  const firstLine = text.split(/\r?\n/).find((line) => line.trim());
  if (firstLine) text = firstLine.trim();
  text = text.replace(/^["「『"'`]+|["」』"'`]+$/g, '').trim();
  text = text.replace(/^(标题|Title)\s*[:：]\s*/i, '');
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/[。.…、，,.;；!！?？]+$/u, '');
  if (!text) return undefined;
  return clampTitleLength(text) || undefined;
}

async function requestTitle(prompt: string): Promise<string | undefined> {
  const provider = getChatProvider();
  const client = getChatProviderRuntimeFor(provider).getClient();
  const modelId = getModelId(provider, 'mini');
  const result = await generateText({
    model: client.chat(modelId),
    instructions: TITLE_INSTRUCTIONS,
    prompt,
    temperature: 0,
    // 生标题必须让模型先出正文：关思考用 none（deepseek/ark），zhipu 模型始终思考不支持 none（拒绝
    // 400），只能给 low。512 兜底「flash 先写 reasoning 耗尽 token 预算再出正文」的旧况。
    maxOutputTokens: 512,
    providerOptions: {
      openai: {
        reasoningEffort: getTitleReasoningEffort(provider),
      },
    },
  });
  return sanitizeTitle(result.text);
}

/**
 * 用 mini 模型把首条用户消息摘要成短标题。
 * 若输出像原文开头，再请求一次；仍失败则返回 undefined，保留已落盘的规则标题。
 */
export async function generateChatTitle(userText: string): Promise<string | undefined> {
  const source = getLlmTitleSource(userText);
  if (!source) return undefined;

  try {
    const first = await requestTitle(buildTitlePrompt(source));
    if (first && !isWeakTitle(first, source)) return first;

    const retry = await requestTitle(
      `上一份标题没有概括用户正文中的具体对象，只复述了技能。请结合正文重新出标题。\n\n${buildTitlePrompt(source)}`,
    );
    if (retry && !isWeakTitle(retry, source)) return retry;

    return undefined;
  } catch (error) {
    console.error('[generate-title] 标题生成失败，回退规则标题', error);
    return undefined;
  }
}
