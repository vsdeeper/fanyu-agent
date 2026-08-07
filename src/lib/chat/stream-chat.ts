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
import { getArkClient } from './providers/ark/client';
import { getChatProvider } from './providers/config';
import { getDeepseekReasoningEffort } from './providers/deepseek/constants';
import { getDeepseekClient } from './providers/deepseek/client';
import { getDeepseekInstructions } from './providers/deepseek/instructions';

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
  // 修复：按场景复杂度自动选择模型；DeepSeek 三档同模型（deepseek-v4-flash），Ark 按 tier 路由
  const provider = getChatProvider();
  const { modelId, tier } = await selectModel(messages, provider);

  // 修复：统一获取当前 Provider 客户端与模型，避免到处分支
  const client = provider === 'deepseek' ? getDeepseekClient() : getArkClient();

  // 修复：user_location 是 OpenAI web_search 专有字段，DeepSeek 不认（与 include 的 InvalidParameter
  // unknown type 同款坑）；仅 Ark 透传近似定位以提升本地化搜索结果精度
  const webSearchArgs =
    provider === 'deepseek' ? {} : userLocation?.type === 'approximate' ? { userLocation } : {};

  const tools = {
    generate_image: createGenerateImageTool(chatId),
    web_search: client.tools.webSearch(webSearchArgs),
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

  // 修复：明确要求思考过程使用中文简体，避免中英文混杂
  const baseInstructions = `使用中文简体与用户对话，思考过程（reasoning/thinking）也必须使用中文简体。\n\n${IMAGE_SYSTEM_HINT}`;

  // 修复：DeepSeek 兼容处理（定位注入 + 引用引导）抽到 providers/deepseek/instructions.ts，
  // stream-chat.ts 只保留 provider 无关的 baseInstructions 与统一分支调用
  const instructions =
    provider === 'deepseek'
      ? getDeepseekInstructions({ userLocation, baseInstructions })
      : baseInstructions;

  const result = streamText({
    model: client.responses(modelId),
    instructions,
    messages: modelMessages,
    tools,
    // 修复：无 stopWhen 时 tool 执行后不会继续汇总；生图+说明需多步
    stopWhen: stepCountIs(5),
    // 修复：第三方 Provider（DeepSeek / Ark）均不支持服务端存储，store 默认 true 产生 item_reference
    // 导致 DeepSeek 重复回答、Ark 报 <nil>；统一 store: false 消除 item_reference
    // 修复：DeepSeek 模型不在 OpenAI 能力清单内，SDK 默认按非推理模型处理 → 不发 reasoning 块；
    // forceReasoning 强制按推理模型处理 + reasoningEffort 下发思考；systemMessageMode 钉死 system，
    // 避免推理模型默认改用 developer role 不被 DeepSeek 接受；Ark 维持原状（不要求思考）
    providerOptions: {
      openai: {
        store: false,
        ...(provider === 'deepseek'
          ? {
              forceReasoning: true,
              reasoningEffort: getDeepseekReasoningEffort(),
              systemMessageMode: 'system' as const,
            }
          : {}),
      },
    },
    // 修复：stop/续写须随客户端 abort 同步中止并落盘半截；勿再用 consumeStream 后台跑完覆盖
    abortSignal,
  });

  // 修复：往 reasoning 流注入模型档位，确保 Think 块一定显示当前执行模型
  const tierId = 'model-tier';
  const wrappedStream = result.stream.pipeThrough(
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
      stream: wrappedStream,
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
