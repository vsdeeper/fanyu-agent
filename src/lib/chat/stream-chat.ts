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
import { dropIncompleteToolParts } from '@/lib/chat/sanitize-messages';
import { saveChat } from '@/lib/chat/store';
import { selectModel } from '@/lib/chat/select-model';
import { createGenerateImageTool, IMAGE_SYSTEM_HINT } from '@/lib/images/generate-image-tool';
import { ark } from './providers/ark/client';

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

export type StreamChatOptions = {
  chatId: string;
  messages: UIMessage[];
  userLocation: UserLocation | undefined;
  abortSignal: AbortSignal;
  sendStart?: boolean;
};

export async function streamChatResponse({
  chatId,
  messages,
  userLocation,
  abortSignal,
  sendStart = true,
}: StreamChatOptions) {
  // 修复：按场景复杂度自动选择模型（Doubao-Seed-2.0 pro/lite/mini）
  const modelId = selectModel(messages);

  // 修复：始终注册 web_search tool，由模型根据用户意图自动判断是否需要搜索
  const tools = {
    generate_image: createGenerateImageTool(chatId),
    web_search: ark.tools.webSearch(userLocation?.type === 'approximate' ? { userLocation } : {}),
  };

  // 修复：勿把历史 reasoning/itemId 回传方舟；磁盘仍保留完整 UIMessage 供刷新展示 Think
  // 修复：stop 在 tool 阶段中断时末条仅有 tool-call 无 result，须 ignoreIncompleteToolCalls
  const modelMessages = pruneMessages({
    messages: await convertToModelMessages(messages, {
      tools,
      ignoreIncompleteToolCalls: true,
    }),
    reasoning: 'all',
  });

  const result = streamText({
    model: ark.responses(modelId),
    // 修复：明确要求思考过程使用中文简体，避免中英文混杂
    instructions: `使用中文简体与用户对话，思考过程（reasoning/thinking）也必须使用中文简体。\n\n${IMAGE_SYSTEM_HINT}`,
    messages: modelMessages,
    tools,
    // 修复：无 stopWhen 时 tool 执行后不会继续汇总；生图+说明需多步
    stopWhen: stepCountIs(5),
    // 修复：避免 store 默认 true 产生 item_reference
    providerOptions: { openai: { store: false } },
    // 修复：stop/续写须随客户端 abort 同步中止并落盘半截；勿再用 consumeStream 后台跑完覆盖
    abortSignal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      sendSources: true,
      sendStart,
      originalMessages: messages,
      generateMessageId,
      onEnd: ({ messages: nextMessages }) => {
        void saveChat({ chatId, messages: dropIncompleteToolParts(nextMessages) });
      },
    }),
  });
}
