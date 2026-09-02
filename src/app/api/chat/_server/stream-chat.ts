import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  isLoopFinished,
  pruneMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type ToolSet,
  type UIMessage,
} from 'ai';

import type { UserLocation } from '@/app/api/geo/_shared/types';
import {
  finalizeIncompleteToolParts,
  markLastAssistantStopped,
  sanitizeFilePartsForModel,
} from '@/app/api/chat/_server/sanitize-messages';
import { generateChatTitle } from '@/app/api/chat/_server/generate-title';
import { saveChat, updateChatTitle } from '@/app/api/chats/_server/store';
import { selectModel } from '@/app/api/chat/_server/select-model';
import { getFirstUserText } from '@/app/api/chat/_server/title';
import { getLatestUserImageDataUrls } from './tools/pasted-image';
import { createCatalogTools, getToolHints } from './tools/registry';
import { buildSkillCatalogPrompt } from '@/lib/skills/server/catalog-prompt';
import { expandSkillTokensInText } from '@/lib/skills/server/expand';
import { getSkill, listSkills } from '@/lib/skills/server/registry';
import { resolveTurnSkills } from '@/lib/skills/server/resolve-turn';
import { getChatProvider } from './providers/config';
import { getChatProviderRuntime } from './providers/resolve';
import { createLocalWebSearchSourceBridge } from './web-search-source-bridge';
import { buildLoopGuard } from './loop-guard';

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

// 工具循环安全上限：isLoopFinished 依赖「模型不再发 tool call」的自然终止，该上限是
// 唯一保证循环必然结束的机制，勿单独移除。放宽需让多图设计流（若干次生成 + 汇总）跑得完。
const MAX_TOOL_LOOP_STEPS = 40;

/** 记录未进 execute 的工具失败（如 Zod 校验）；仅服务端日志，不改用户可见文案。 */
function logStreamToolErrors(
  content: Array<{ type: string; toolName?: string; error?: unknown; input?: unknown }>,
) {
  for (const part of content) {
    if (part.type !== 'tool-error') continue;
    console.error('[chat] tool-error', {
      toolName: part.toolName,
      error: part.error,
      input: part.input,
    });
  }
}

export type StreamChatOptions = {
  chatId: string;
  messages: UIMessage[];
  userLocation: UserLocation | undefined;
  abortSignal: AbortSignal;
  /** 并入本轮激活与粘滞，保证指定 skill 的工具与 instructions 生效 */
  forcedSkillIds?: string[];
  /** 拼在 Activation 块之后，供工作台等入口覆盖 skill 正文中的确认门 */
  extraInstructions?: string;
  /** 跳过对话标题摘要（工作台会话不进侧栏） */
  skipTitle?: boolean;
};

/** 按注册表去重追加 skill id */
function mergeSkillIds(base: string[], extra: string[] | undefined): string[] {
  if (!extra?.length) return base;
  const seen = new Set(base);
  const out = [...base];
  for (const id of extra) {
    if (seen.has(id) || !getSkill(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

export async function streamChatResponse({
  chatId,
  messages,
  userLocation,
  abortSignal,
  forcedSkillIds,
  extraInstructions,
  skipTitle,
}: StreamChatOptions) {
  const isFirstUserTurn = messages.filter((message) => message.role === 'user').length === 1;
  const firstUserText = isFirstUserTurn ? getFirstUserText(messages) : '';
  // 与主对话并行摘要；不绑 abortSignal，停止生成仍应留下标题
  const titlePromise =
    skipTitle || !firstUserText
      ? Promise.resolve(undefined)
      : generateChatTitle(firstUserText).then(async (llmTitle) => {
          if (llmTitle) {
            await updateChatTitle(chatId, llmTitle);
          }
          return llmTitle;
        });

  const runtime = getChatProviderRuntime();
  const provider = getChatProvider();
  const { modelId, tier } = await selectModel(messages, provider);
  // 模型档位只在服务端打印供排查，不注入流展示给用户
  console.info('[chat] select-model', { chatId, modelId, tier });
  const client = runtime.getClient();
  const capabilities = runtime.getCapabilities();

  const pastedImageDataUrls = getLatestUserImageDataUrls(messages);

  const resolved = resolveTurnSkills(messages, {
    log: false,
  });
  const turnActivatedIds = mergeSkillIds(resolved.turnActivatedIds, forcedSkillIds);
  const mergedSkillIds = mergeSkillIds(resolved.mergedSkillIds, forcedSkillIds);
  const turnActivatedSkills = turnActivatedIds.flatMap((id) => {
    const skill = getSkill(id);
    return skill ? [skill] : [];
  });
  const activatedIds = new Set(turnActivatedIds);
  const allSkillIds = new Set(listSkills().map((skill) => skill.id));

  // 联网搜索构造权在 Provider：usesSdkWebSearchTool=true（deepseek/ark）注册 SDK 原生
  // server tool；否则（zhipu）由本地 web_search 工具经独立 API 显式检索
  const catalogTools = createCatalogTools({
    chatId,
    pastedImageDataUrls,
    mainModelAcceptsImage: capabilities.acceptsImageInput,
    providerHasNativeWebSearch: capabilities.usesSdkWebSearchTool,
    activatedSkillIds: turnActivatedIds,
    stickySkillIds: mergedSkillIds,
  });
  const tools = {
    ...catalogTools,
    ...(capabilities.usesSdkWebSearchTool
      ? { web_search: client.tools.webSearch(runtime.getWebSearchArgs(userLocation)) }
      : {}),
  };

  // 修复：勿把历史 reasoning/itemId 回传方舟；磁盘仍保留完整 UIMessage 供刷新展示 Think
  // 修复：stop 在 tool 阶段中断时末条仅有 tool-call 无 result，须 ignoreIncompleteToolCalls
  // 修复：text/* 与 .docx 附件在转模型入参前解码为 text part，否则方舟 Responses 对非
  // application/pdf 内联文件抛 UnsupportedFunctionalityError（AI SDK 转换阶段硬抛，fetch 拦不到）
  const convertedMessages = await convertToModelMessages(
    await sanitizeFilePartsForModel(messages, {
      acceptsImageInput: capabilities.acceptsImageInput,
    }),
    {
      tools,
      ignoreIncompleteToolCalls: true,
    },
  );
  const modelMessages = pruneMessages({
    messages: convertedMessages,
    reasoning: 'all',
  });

  // skill 令牌：历史消息一律短引用，避免把过期 instructions 再塞进上下文；
  // 本轮已 Activation 的 id 同样短引用（正文只出现在 instructions 块）。
  let lastUserIndex = -1;
  for (let i = modelMessages.length - 1; i >= 0; i--) {
    if (modelMessages[i]?.role === 'user') {
      lastUserIndex = i;
      break;
    }
  }

  const expandedMessages = modelMessages.map((message, index) => {
    if (message.role !== 'user') return message;
    const seenIds = index === lastUserIndex ? new Set(activatedIds) : new Set(allSkillIds);
    const content = message.content;
    if (typeof content === 'string') {
      return { ...message, content: expandSkillTokensInText(content, seenIds) };
    }
    if (Array.isArray(content)) {
      return {
        ...message,
        content: content.map((part) =>
          part.type === 'text'
            ? { ...part, text: expandSkillTokensInText(part.text, seenIds) }
            : part,
        ),
      };
    }
    return message;
  });

  const stoppedTaskHint = [
    '对话规则：',
    '- 只回答用户最新一条消息所问的问题',
    '- 历史中若存在用户已停止的未完成助手回复，视为该轮任务已取消',
    '- 不要续写、补答或总结那些已停止的任务，也不要在回复末尾询问是否继续执行旧任务',
  ].join('\n');

  const catalogPrompt = buildSkillCatalogPrompt();
  const activationBlock = turnActivatedSkills.length
    ? `\n\n【本轮激活 Skills：${turnActivatedSkills
        .map((skill) => skill.name)
        .join('、')}】\n${turnActivatedSkills.map((skill) => skill.instructions).join('\n\n')}`
    : '';
  const extraBlock = extraInstructions?.trim() ? `\n\n${extraInstructions.trim()}` : '';

  // 修复：明确要求思考过程使用中文简体，避免中英文混杂
  const baseInstructions = `使用中文简体与用户对话，思考过程（reasoning/thinking）也必须使用中文简体，并用短段落、空行分隔要点，避免写成一整段。\n\n${stoppedTaskHint}\n\n${catalogPrompt}${activationBlock}${extraBlock}\n\n${getToolHints(pastedImageDataUrls.length > 0, capabilities.acceptsImageInput, capabilities.usesSdkWebSearchTool)}`;

  const instructions = runtime.getInstructions({
    userLocation,
    baseInstructions,
    convertedMessages,
  });

  const result = streamText({
    model: runtime.getMainModel(modelId),
    instructions,
    messages: expandedMessages,
    tools,
    // 自动循环：跑至自然终止（模型某步不再发 tool call）。isLoopFinished 永不返回 true，
    // 真正保证循环必然结束的是 stepCountIs(MAX_TOOL_LOOP_STEPS)，两者缺一不可——仅靠
    // isLoopFinished 会变成无上限循环。prepareStep 守卫负责失败工具重试的死循环收尾。
    stopWhen: [isLoopFinished(), stepCountIs(MAX_TOOL_LOOP_STEPS)],
    prepareStep: buildLoopGuard(Object.keys(tools) as Array<keyof ToolSet & string>),
    // store:false 仅 Responses 端点链路需要（防 item_reference）；Chat Completions 链路
    // 发 OpenAI 专有字段有 400 风险，由 needsOpenaiStoreFalse 能力位分流，勿恢复统一注入
    providerOptions: {
      openai: {
        ...(capabilities.needsOpenaiStoreFalse ? { store: false } : {}),
        ...runtime.getOpenAIOptions(),
      },
    },
    // 修复：stop 须随客户端 abort 同步中止并落盘半截；勿再用 consumeStream 后台跑完覆盖
    abortSignal,
    onError: ({ error }) => {
      console.error('[chat] stream error', error);
    },
    onStepEnd: ({ content }) => {
      logStreamToolErrors(content);
    },
  });

  // 本地 web_search 工具的结果经桥接转 source part（原生联网链路自带注解产物，勿重复注入）
  const modelStream = capabilities.usesSdkWebSearchTool
    ? result.stream
    : result.stream.pipeThrough(createLocalWebSearchSourceBridge());

  const modelUiStream = toUIMessageStream({
    stream: modelStream,
    sendSources: true,
    originalMessages: messages,
    generateMessageId,
    onEnd: async ({ messages: nextMessages, isAborted }) => {
      let toSave = finalizeIncompleteToolParts(nextMessages);
      if (isAborted) {
        toSave = markLastAssistantStopped(toSave);
      }
      await saveChat({ chatId, messages: toSave });
      await titlePromise;
    },
  });

  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        void titlePromise.then((title) => {
          if (!title) return;
          writer.write({
            type: 'data-chat-title',
            data: { title },
            transient: true,
          });
        });
        writer.merge(modelUiStream);
      },
    }),
  });
}
