import { createOpenAI } from '@ai-sdk/openai';

import { resolveCredentialFromSettings } from '@/app/api/chat/_server/request-settings';
import { patchArkRequestBody, type ArkRequestBody } from './request-patch';
import { normalizeArkResponse } from './sse';

const clientCache = new Map<string, ReturnType<typeof createOpenAI>>();

/**
 * 惰性构造方舟客户端；凭据仅来自本轮对话 settings。
 */
export function getArkClient() {
  const creds = resolveCredentialFromSettings('ark');
  const apiKey = creds.apiKey;
  const baseURL = creds.baseUrl;
  const cacheKey = `${apiKey}\0${baseURL}`;
  let instance = clientCache.get(cacheKey);
  if (!instance) {
    instance = createOpenAI({
      apiKey,
      baseURL,
      fetch: async (url, init) => {
        if (init?.body && typeof init.body === 'string') {
          const body = JSON.parse(init.body) as ArkRequestBody;

          if (patchArkRequestBody(body)) {
            init = { ...init, body: JSON.stringify(body) };
          }
        }

        const response = await globalThis.fetch(url, init);

        // 修复：SSE 注入 annotation.added；非流式 JSON 补 annotations，否则 Zod 报 Invalid JSON
        return normalizeArkResponse(response);
      },
    });
    clientCache.set(cacheKey, instance);
  }
  return instance;
}
