import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/server/env';
import {
  getChatSettings,
  resolveCredentialFromSettings,
} from '@/app/api/chat/_server/request-settings';
import { patchArkRequestBody, type ArkRequestBody } from './request-patch';
import { normalizeArkResponse } from './sse';

const clientCache = new Map<string, ReturnType<typeof createOpenAI>>();

function resolveArkCreds(): { apiKey: string; baseURL: string } {
  if (getChatSettings()) {
    const creds = resolveCredentialFromSettings('ark');
    return { apiKey: creds.apiKey, baseURL: creds.baseUrl };
  }
  return {
    apiKey: requireEnv('ARK_API_KEY'),
    baseURL: requireEnv('ARK_BASE_URL'),
  };
}

/**
 * 惰性构造方舟客户端；有请求 settings 时用其凭据，否则读 ARK_*。
 */
export function getArkClient() {
  const { apiKey, baseURL } = resolveArkCreds();
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
