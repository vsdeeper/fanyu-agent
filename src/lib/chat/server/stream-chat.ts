import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  pruneMessages,
  stepCountIs,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';

import type { UserLocation } from '@/lib/geo/types';
import {
  finalizeIncompleteToolParts,
  markLastAssistantStopped,
  sanitizeFilePartsForModel,
} from '@/lib/chat/server/sanitize-messages';
import { saveChat } from '@/lib/chat/server/store';
import { selectModel } from '@/lib/chat/server/select-model';
import { getLatestUserImageDataUrl } from '@/lib/tools/server/pasted-image';
import { createCatalogTools, getToolHints } from '@/lib/tools/server/registry';
import { resolveActiveSkills } from '@/lib/skills/server/context';
import { expandSkillTokensInText } from '@/lib/skills/server/expand';
import { getChatProvider } from './providers/config';
import { getChatProviderRuntime } from './providers/resolve';

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

export type StreamChatOptions = {
  chatId: string;
  messages: UIMessage[];
  userLocation: UserLocation | undefined;
  abortSignal: AbortSignal;
};

export async function streamChatResponse({
  chatId,
  messages,
  userLocation,
  abortSignal,
}: StreamChatOptions) {
  const runtime = getChatProviderRuntime();
  const provider = getChatProvider();
  const { modelId, tier } = await selectModel(messages, provider);
  const client = runtime.getClient();

  const pastedImageDataUrl = getLatestUserImageDataUrl(messages);

  const tools = {
    ...createCatalogTools({ chatId, pastedImageDataUrl }),
    web_search: client.tools.webSearch(runtime.getWebSearchArgs(userLocation)),
  };

  // 修复：勿把历史 reasoning/itemId 回传方舟；磁盘仍保留完整 UIMessage 供刷新展示 Think
  // 修复：stop 在 tool 阶段中断时末条仅有 tool-call 无 result，须 ignoreIncompleteToolCalls
  // 修复：text/* 与 .docx 附件在转模型入参前解码为 text part，否则方舟 Responses 对非
  // application/pdf 内联文件抛 UnsupportedFunctionalityError（AI SDK 转换阶段硬抛，fetch 拦不到）
  const convertedMessages = await convertToModelMessages(
    await sanitizeFilePartsForModel(messages),
    {
      tools,
      ignoreIncompleteToolCalls: true,
    },
  );
  const modelMessages = pruneMessages({
    messages: convertedMessages,
    reasoning: 'all',
  });

  // 修复：skill 令牌原位展开——把模型入参副本里用户文本的 /<skillId> 在原位置替换为指令块，
  // 让约束与用户意图的位置对应（勿只堆在系统提示词末尾）。展开发生在 convert/prune 副本上，
  // saveChat 仍落盘原文（含 /skill 令牌与 metadata.skillIds），历史可读且刷新后依旧。
  const expandedMessages = modelMessages.map((message) => {
    if (message.role !== 'user') return message;
    const seenIds = new Set<string>();
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

  // 修复：skill 激活集合作为会话上下文——用原始 messages（含本次新消息）推导最近一次写入的集合，
  // 指令并入 baseInstructions，保证后续消息持续受约束；与令牌原位展开互补。
  const activeSkills = resolveActiveSkills(messages);

  const stoppedTaskHint = [
    '对话规则：',
    '- 只回答用户最新一条消息所问的问题',
    '- 历史中若存在用户已停止的未完成助手回复，视为该轮任务已取消',
    '- 不要续写、补答或总结那些已停止的任务，也不要在回复末尾询问是否继续执行旧任务',
  ].join('\n');

  // 修复：明确要求思考过程使用中文简体，避免中英文混杂
  const baseInstructions = `使用中文简体与用户对话，思考过程（reasoning/thinking）也必须使用中文简体。\n\n${stoppedTaskHint}\n\n${getToolHints(Boolean(pastedImageDataUrl))}`;
  const withSkill = activeSkills.length
    ? `${baseInstructions}\n\n【当前生效 Skills：${activeSkills
        .map((skill) => skill.name)
        .join('、')}】\n${activeSkills.map((skill) => skill.instructions).join('\n\n')}`
    : baseInstructions;

  const instructions = runtime.getInstructions({
    userLocation,
    baseInstructions: withSkill,
    convertedMessages,
  });

  const result = streamText({
    model: client.responses(modelId),
    instructions,
    messages: expandedMessages,
    tools,
    // 修复：无 stopWhen 时 tool 执行后不会继续汇总；生图+说明需多步
    stopWhen: stepCountIs(5),
    // 修复：第三方 Provider（DeepSeek / Ark）均不支持服务端存储，store 默认 true 产生 item_reference
    // 导致 DeepSeek 重复回答、Ark 报 <nil>；统一 store: false 消除 item_reference
    providerOptions: {
      openai: {
        store: false,
        ...runtime.getOpenAIOptions(),
      },
    },
    // 修复：stop 须随客户端 abort 同步中止并落盘半截；勿再用 consumeStream 后台跑完覆盖
    abortSignal,
  });

  // 修复：往 reasoning 流注入模型档位，确保 Think 块一定显示当前执行模型
  const tierId = 'model-tier';
  const tierInjectedStream = result.stream.pipeThrough(
    new TransformStream({
      transform(part, controller) {
        controller.enqueue(part);
        if (part.type === 'start') {
          controller.enqueue({ type: 'reasoning-start', id: tierId });
          controller.enqueue({
            type: 'reasoning-delta',
            id: tierId,
            text: `当前执行模型: ${tier}......`,
          });
          controller.enqueue({ type: 'reasoning-end', id: tierId });
        }
      },
    }),
  );

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: tierInjectedStream,
      sendSources: true,
      originalMessages: messages,
      generateMessageId,
      onEnd: async ({ messages: nextMessages, isAborted }) => {
        let toSave = finalizeIncompleteToolParts(nextMessages);
        if (isAborted) {
          toSave = markLastAssistantStopped(toSave);
        }
        await saveChat({ chatId, messages: toSave });
      },
    }),
  });
}
