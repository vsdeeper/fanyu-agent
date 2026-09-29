import { createOpenAI } from '@ai-sdk/openai';

import { resolveCredentialFromSettings } from '@/app/api/chat/_server/request-settings';
import { patchZhipuRequestBody, type ZhipuRequestBody } from './request-patch';
import { normalizeZhipuSse } from './sse';

const clientCache = new Map<string, ReturnType<typeof createOpenAI>>();

/**
 * 惰性构造智谱客户端；凭据仅来自本轮对话 settings。
 */
export function getZhipuClient() {
  const creds = resolveCredentialFromSettings('zhipu');
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
          const body = JSON.parse(init.body) as ZhipuRequestBody;

          if (patchZhipuRequestBody(body)) {
            init = { ...init, body: JSON.stringify(body) };
          }
        }

        const response = await globalThis.fetch(url, init);

        return normalizeZhipuSse(response);
      },
    });
    clientCache.set(cacheKey, instance);
  }
  return instance;
}
