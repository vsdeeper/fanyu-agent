import { createOpenAI } from '@ai-sdk/openai';

import { resolveCredentialFromSettings } from '@/app/api/chat/_server/request-settings';
import { patchDeepSeekRequestBody, type DeepSeekRequestBody } from './request-patch';
import { normalizeDeepseekSse } from './sse';

const clientCache = new Map<string, ReturnType<typeof createOpenAI>>();

/**
 * 惰性构造 DeepSeek 客户端；凭据仅来自本轮对话 settings。
 */
export function getDeepseekClient() {
  const creds = resolveCredentialFromSettings('deepseek');
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
