import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStreamResponse,
  pruneMessages,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import type { UserLocation } from '@/lib/user-location';
import { ApiErrorCode, jsonFail } from '@/lib/api-response';
import { loadChat, saveChat } from '@/lib/chat-store';
import { normalizeArkResponsesSse } from './ark-sse';

// globalThis.AI_SDK_LOG_WARNINGS = false;

export const maxDuration = 60;
export const runtime = 'nodejs';

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
  apiKey: process.env.ARK_API_KEY,
  baseURL: process.env.ARK_BASE_URL ?? 'https://ark.cn-beijing.volces.com/api/v3',
  fetch: async (url, init) => {
    if (init?.body && typeof init.body === 'string') {
      const body = JSON.parse(init.body) as {
        input?: Array<{ role?: string; type?: string; status?: string }>;
        include?: string[];
      };
      let patched = false;

      if (Array.isArray(body.input)) {
        body.input = body.input.map((item) => {
          if (!item || typeof item !== 'object') return item;
          const next = { ...item };
          // 修复：有 role 无 type 时方舟报 MissingParameter input.type
          if (item.role && item.type == null) {
            next.type = 'message';
          }
          // 修复：回放 assistant 缺 status 时方舟报 MissingParameter input.status
          if (item.role === 'assistant' && item.status == null) {
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

export async function POST(req: Request) {
  try {
    const {
      id,
      message,
      webSearch = true,
      userLocation: rawUserLocation,
    }: {
      id: string;
      message: UIMessage;
      webSearch?: boolean;
      userLocation?: unknown;
    } = await req.json();

    if (!id || typeof id !== 'string' || !message) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '缺少会话或消息内容', 400);
    }

    const modelId = process.env.ARK_MODEL_ID?.trim();
    if (!modelId) {
      return jsonFail(ApiErrorCode.ARK_NOT_CONFIGURED, '对话服务暂不可用', 503);
    }

    // 修复：/chat 草稿首条磁盘无记录，勿 404；历史从磁盘拼，勿信任客户端整包 messages
    let previousMessages: UIMessage[] = [];
    try {
      previousMessages = (await loadChat(id)).messages;
    } catch {
      /* 新草稿 */
    }

    const messages = [...previousMessages, message];
    const userLocation = parseUserLocation(rawUserLocation);

    // 修复：流式前先落盘用户消息，侧栏 refresh 即可见新会话与标题
    await saveChat({ chatId: id, messages });

    // 修复：勿把历史 reasoning/itemId 回传方舟；磁盘仍保留完整 UIMessage 供刷新展示 Think
    const modelMessages = pruneMessages({
      messages: await convertToModelMessages(messages),
      reasoning: 'all',
    });

    const result = streamText({
      model: ark.responses(modelId),
      system: '按用户语言与语境自然回答。',
      messages: modelMessages,
      ...(webSearch
        ? {
            tools: {
              web_search: ark.tools.webSearch(
                userLocation?.type === 'approximate' ? { userLocation } : {},
              ),
            },
          }
        : {}),
      // 修复：避免 store 默认 true 产生 item_reference
      providerOptions: { openai: { store: false } },
    });

    // 修复：客户端断开时仍消费流，确保 onEnd 落盘，避免半截会话
    void result.consumeStream();

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        sendSources: true,
        originalMessages: messages,
        generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
        onEnd: ({ messages: nextMessages }) => {
          void saveChat({ chatId: id, messages: nextMessages });
        },
      }),
    });
  } catch {
    // 修复：勿把 err.message 写入响应，避免英文 provider/内部错误暴露给客户端
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
