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

import { createOpenAI } from '@ai-sdk/openai';

import type { UserLocation } from '@/lib/shared/user-location';

import { ApiErrorCode, jsonFail } from '@/lib/shared/api-response';

import { loadChat, saveChat } from '@/lib/chat/store';

import { requireEnv } from '@/lib/shared/env';

import { createGenerateImageTool, IMAGE_SYSTEM_HINT } from '@/lib/image-gen/generate-image-tool';

import { normalizeArkResponsesSse } from './ark-sse';

// globalThis.AI_SDK_LOG_WARNINGS = false;

export const maxDuration = 120;

export const runtime = 'nodejs';

type ChatTrigger = 'submit-message' | 'continue-message';

/** 仅接受 approximate + 已知可选字符串字段，忽略非法结构 */

function parseUserLocation(value: unknown): UserLocation | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const raw = value as Record<string, unknown>;

  if (raw.type !== 'approximate') return undefined;

  const pick = (key: string): string | undefined => {
    const v = raw[key];

    return typeof v === 'string' && v.trim() ? v.trim() : undefined;
  };

  return {
    type: 'approximate',

    ...(pick('country') ? { country: pick('country') } : {}),

    ...(pick('city') ? { city: pick('city') } : {}),

    ...(pick('region') ? { region: pick('region') } : {}),

    ...(pick('timezone') ? { timezone: pick('timezone') } : {}),
  };
}

/**

 * 方舟 Responses 与 OpenAI SDK 默认行为不完全兼容，多轮时需注意：

 * 1. 回放历史时方舟要求显式 type/status；SDK 常省略 → MissingParameter input.type / input.status

 * 2. store 默认 true 会发 item_reference，方舟易报 input ... <nil> → 使用 store: false

 * 3. 历史 reasoning + itemId 与方舟不兼容 → pruneMessages 去掉 reasoning；前端 Think 仍可展示本轮流式思考

 * 4. @ai-sdk/openai 遇 web_search 会自动加 include: web_search_call.action.sources（OpenAI 专有）；

 *    方舟报 unknown type → 出站前剥离不支持的 include（同类还有 reasoning.encrypted_content）

 * 5. 方舟引用多在 message.annotations，不发 annotation.added；SDK 流式只认后者 → fetch SSE 注入/补全

 */

/** 方舟 Responses 不认的 OpenAI include 值（Cherry Studio #13144 等同款坑） */

const ARK_UNSUPPORTED_INCLUDES = new Set([
  'web_search_call.action.sources',

  'reasoning.encrypted_content',
]);

const ark = createOpenAI({
  apiKey: requireEnv('ARK_API_KEY'),

  baseURL: requireEnv('ARK_BASE_URL'),

  fetch: async (url, init) => {
    if (init?.body && typeof init.body === 'string') {
      const body = JSON.parse(init.body) as {
        input?: Array<{ role?: string; type?: string; status?: string }>;

        include?: string[];
      };

      let patched = false;

      if (Array.isArray(body.input)) {
        const lastInputIndex = body.input.length - 1;

        body.input = body.input.map((item, index) => {
          if (!item || typeof item !== 'object') return item;

          const next = { ...item } as {
            role?: string;
            type?: string;
            status?: string;
            partial?: boolean;
          };

          // 修复：有 role 无 type 时方舟报 MissingParameter input.type
          if (item.role && item.type == null) {
            next.type = 'message';
          }

          const isLast = index === lastInputIndex;

          // 修复：断点续写时末条 assistant/reasoning 须 partial+incomplete；勿标 completed（方舟报 MissingParameter partial）
          if (isLast && (next.role === 'assistant' || next.type === 'reasoning')) {
            if (next.status == null || next.status === 'completed') {
              next.partial = true;
              next.status = 'incomplete';
            }
          } else if (item.role === 'assistant' && item.status == null) {
            // 修复：回放历史 assistant 缺 status 时方舟报 MissingParameter input.status
            next.status = 'completed';
          }

          return next;
        });

        patched = true;
      }

      // 修复：SDK 自动注入的 OpenAI include，方舟报 InvalidParameter unknown type

      if (Array.isArray(body.include)) {
        const nextInclude = body.include.filter((item) => !ARK_UNSUPPORTED_INCLUDES.has(item));

        if (nextInclude.length === 0) {
          delete body.include;
        } else {
          body.include = nextInclude;
        }

        patched = true;
      }

      if (patched) {
        init = { ...init, body: JSON.stringify(body) };
      }
    }

    const response = await globalThis.fetch(url, init);

    // 修复：注入 annotation.added，否则 sendSources 也拿不到 source-url

    return normalizeArkResponsesSse(response);
  },
});

const generateMessageId = createIdGenerator({ prefix: 'msg', size: 16 });

async function streamChatResponse({
  chatId,

  messages,

  webSearch,

  userLocation,

  abortSignal,

  sendStart = true,
}: {
  chatId: string;

  messages: UIMessage[];

  webSearch: boolean;

  userLocation: UserLocation | undefined;

  abortSignal: AbortSignal;

  sendStart?: boolean;
}) {
  const modelId = requireEnv('ARK_MODEL_ID');

  // 修复：勿把历史 reasoning/itemId 回传方舟；磁盘仍保留完整 UIMessage 供刷新展示 Think

  const modelMessages = pruneMessages({
    messages: await convertToModelMessages(messages),

    reasoning: 'all',
  });

  const result = streamText({
    model: ark.responses(modelId),

    system: `按用户语言与语境自然回答。\n\n${IMAGE_SYSTEM_HINT}`,

    messages: modelMessages,

    tools: {
      generate_image: createGenerateImageTool(chatId),

      ...(webSearch
        ? {
            web_search: ark.tools.webSearch(
              userLocation?.type === 'approximate' ? { userLocation } : {},
            ),
          }
        : {}),
    },

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
        void saveChat({ chatId, messages: nextMessages });
      },
    }),
  });
}

export async function POST(req: Request) {
  try {
    const {
      id,

      message,

      trigger = 'submit-message',

      messageId,

      webSearch = true,

      userLocation: rawUserLocation,
    }: {
      id: string;

      message?: UIMessage;

      trigger?: ChatTrigger;

      messageId?: string;

      webSearch?: boolean;

      userLocation?: unknown;
    } = await req.json();

    if (!id || typeof id !== 'string') {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
    }

    const userLocation = parseUserLocation(rawUserLocation);

    if (trigger === 'continue-message') {
      if (!messageId || typeof messageId !== 'string') {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
      }

      let messages: UIMessage[];

      try {
        messages = (await loadChat(id)).messages;
      } catch {
        return jsonFail(ApiErrorCode.CHAT_NOT_FOUND, '会话不存在', 404);
      }

      const lastMessage = messages.at(-1);

      if (!lastMessage || lastMessage.role !== 'assistant' || lastMessage.id !== messageId) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '无法继续生成该回复', 400);
      }

      return streamChatResponse({
        chatId: id,

        messages,

        webSearch,

        userLocation,

        abortSignal: req.signal,

        sendStart: false,
      });
    }

    if (!message) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
    }

    // 修复：/chat 草稿首条磁盘无记录，勿 404；历史从磁盘拼，勿信任客户端整包 messages

    let previousMessages: UIMessage[] = [];

    try {
      previousMessages = (await loadChat(id)).messages;
    } catch {
      /* 新草稿 */
    }

    const messages = [...previousMessages, message];

    // 修复：流式前先落盘用户消息，侧栏 refresh 即可见新会话与标题

    await saveChat({ chatId: id, messages });

    return streamChatResponse({
      chatId: id,

      messages,

      webSearch,

      userLocation,

      abortSignal: req.signal,
    });
  } catch {
    // 修复：勿把 err.message 写入响应，避免英文 provider/内部错误暴露给客户端

    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
