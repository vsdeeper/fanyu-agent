import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/env';
import { patchDeepSeekRequestBody, type DeepSeekRequestBody } from './request-patch';
import { normalizeDeepseekSse } from './sse';

let instance: ReturnType<typeof createOpenAI> | undefined;

/**
 * 惰性构造 DeepSeek 客户端：仅当 CHAT_PROVIDER=deepseek 时才读取 DEEPSEEK_* 环境变量。
 * 自定义 fetch 负责出站剥离 OpenAI 专有 include，入站 SSE 归一化（reasoning + web_search 事件名翻译）。
 */
export function getDeepseekClient() {
  if (!instance) {
    instance = createOpenAI({
      apiKey: requireEnv('DEEPSEEK_API_KEY'),
      baseURL: requireEnv('DEEPSEEK_BASE_URL'),
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
  }
  return instance;
}
