import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/env';
import { patchArkRequestBody, type ArkRequestBody } from './request-patch';
import { normalizeArkResponsesSse } from './sse';

let instance: ReturnType<typeof createOpenAI> | undefined;

/**
 * 惰性构造方舟客户端：主对话 CHAT_PROVIDER=ark、以及识图 analyze_image（始终走方舟视觉模型）时读取 ARK_*。
 * 自定义 fetch 负责出站请求修补（兼容方舟 Responses API）与入站 SSE 归一化（注入 annotation.added）。
 */
export function getArkClient() {
  if (!instance) {
    instance = createOpenAI({
      apiKey: requireEnv('ARK_API_KEY'),
      baseURL: requireEnv('ARK_BASE_URL'),
      fetch: async (url, init) => {
        if (init?.body && typeof init.body === 'string') {
          const body = JSON.parse(init.body) as ArkRequestBody;

          if (patchArkRequestBody(body)) {
            init = { ...init, body: JSON.stringify(body) };
          }
        }

        const response = await globalThis.fetch(url, init);

        // 修复：注入 annotation.added，否则 sendSources 也拿不到 source-url
        return normalizeArkResponsesSse(response);
      },
    });
  }
  return instance;
}
