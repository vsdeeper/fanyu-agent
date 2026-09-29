import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/server/env';
import {
  getChatSettings,
  resolveCredentialFromSettings,
} from '@/app/api/chat/_server/request-settings';
import { patchDeepSeekRequestBody, type DeepSeekRequestBody } from './request-patch';
import { normalizeDeepseekSse } from './sse';

const clientCache = new Map<string, ReturnType<typeof createOpenAI>>();

function resolveDeepseekCreds(): { apiKey: string; baseURL: string } {
  if (getChatSettings()) {
    const creds = resolveCredentialFromSettings('deepseek');
    return { apiKey: creds.apiKey, baseURL: creds.baseUrl };
  }
  return {
    apiKey: requireEnv('DEEPSEEK_API_KEY'),
    baseURL: requireEnv('DEEPSEEK_BASE_URL'),
  };
}

/**
 * 惰性构造 DeepSeek 客户端；有请求 settings 时用其凭据（按 key+url 缓存），否则读 env。
 */
export function getDeepseekClient() {
  const { apiKey, baseURL } = resolveDeepseekCreds();
  const cacheKey = `${apiKey}\0${baseURL}`;
  let instance = clientCache.get(cacheKey);
  if (!instance) {
    instance = createOpenAI({
      apiKey,
      baseURL,
      fetch: async (url, init) => {
        if (init?.body && typeof init.body === 'string') {
          const body = JSON.parse(init.body) as DeepSeekRequestBody;

          if (patchDeepSeekRequestBody(body)) {
            init = { ...init, body: JSON.stringify(body) };
          }
        }

        const response = await globalThis.fetch(url, init);

        // 修复：归一化 DeepSeek SSE 事件名（reasoning_text.delta → reasoning_summary_text.delta 等）
        // 确保 @ai-sdk/openai 的 chunk schema 能匹配并产出 reasoning-delta / tool-call
        return normalizeDeepseekSse(response);
      },
    });
    clientCache.set(cacheKey, instance);
  }
  return instance;
}
