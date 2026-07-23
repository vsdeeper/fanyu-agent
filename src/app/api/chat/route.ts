import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  pruneMessages,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export const maxDuration = 60;

/**
 * 方舟 Responses 与 OpenAI SDK 默认行为不完全兼容，多轮时需注意：
 * 1. 回放历史时方舟要求显式 type/status；SDK 常省略 → MissingParameter input.type / input.status
 * 2. store 默认 true 会发 item_reference，方舟易报 input ... <nil> → 使用 store: false
 * 3. 历史 reasoning + itemId 与方舟不兼容 → pruneMessages 去掉 reasoning；前端 Think 仍可展示本轮流式思考
 * 4. @ai-sdk/openai 遇 web_search 会自动加 include: web_search_call.action.sources（OpenAI 专有）；
 *    方舟报 unknown type → 出站前剥离不支持的 include（同类还有 reasoning.encrypted_content）
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
          // 坑点：有 role 无 type 时方舟报 MissingParameter input.type
          if (item.role && item.type == null) {
            next.type = 'message';
          }
          // 坑点：回放 assistant 缺 status 时方舟报 MissingParameter input.status
          if (item.role === 'assistant' && item.status == null) {
            next.status = 'completed';
          }
          return next;
        });
        patched = true;
      }

      // 坑点：SDK 自动注入的 OpenAI include，方舟报 InvalidParameter unknown type
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
    return globalThis.fetch(url, init);
  },
});

export async function POST(req: Request) {
  const { messages, webSearch = true }: { messages: UIMessage[]; webSearch?: boolean } =
    await req.json();

  // 坑点：勿把历史 reasoning/itemId 回传方舟；不影响前端对本轮思考的展示
  const modelMessages = pruneMessages({
    messages: await convertToModelMessages(messages),
    reasoning: 'all',
  });

  const result = streamText({
    model: ark.responses(process.env.ARK_MODEL_ID ?? 'deepseek-v4-flash-260425'),
    system:
      '你是一个简洁、友好的中文助手。思考过程与最终回答都必须使用简体中文，不要使用英文推演（专有名词、URL、工具名除外）。',
    messages: modelMessages,
    ...(webSearch
      ? {
          tools: {
            web_search: ark.tools.webSearch(),
          },
        }
      : {}),
    // 坑点：避免 store 默认 true 产生 item_reference
    providerOptions: { openai: { store: false } },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream, sendSources: true }),
  });
}
