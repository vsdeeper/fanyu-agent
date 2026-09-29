import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/server/env';
import {
  getChatSettings,
  resolveCredentialFromSettings,
} from '@/app/api/chat/_server/request-settings';
import { patchZhipuRequestBody, type ZhipuRequestBody } from './request-patch';
import { normalizeZhipuSse } from './sse';

const clientCache = new Map<string, ReturnType<typeof createOpenAI>>();

function resolveZhipuCreds(): { apiKey: string; baseURL: string } {
  if (getChatSettings()) {
    const creds = resolveCredentialFromSettings('zhipu');
    return { apiKey: creds.apiKey, baseURL: creds.baseUrl };
  }
  return {
    apiKey: requireEnv('ZHIPU_API_KEY'),
    baseURL: requireEnv('ZHIPU_BASE_URL'),
  };
}

/**
 * 惰性构造智谱客户端；有请求 settings 时用其凭据，否则读 ZHIPU_*。
 */
export function getZhipuClient() {
  const { apiKey, baseURL } = resolveZhipuCreds();
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
