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

          // 临时调试：打印出站请求体关键字段，确认事件名后移除
          const logBody = JSON.parse(init.body as string);
          console.error('[deepseek req]', {
            model: logBody.model,
            hasTools: Array.isArray(logBody.tools)
              ? logBody.tools.map((t: { type?: string }) => t.type)
              : undefined,
            hasInclude: logBody.include,
            hasReasoning: logBody.reasoning,
            store: logBody.store,
            systemMessageMode:
              logBody.input?.[0]?.role === 'developer' ? 'developer' : logBody.input?.[0]?.role,
          });
        }

        const response = await globalThis.fetch(url, init);

        // 临时调试：dump 原始 DeepSeek SSE 事件前 16KB，确认事件名后移除
        const ct = response.headers.get('content-type') ?? '';
        if (ct.includes('text/event-stream')) {
          response
            .clone()
            .text()
            .then((text) => {
              console.error('[deepseek SSE raw]', text.slice(0, 16384));
            })
            .catch((e) => console.error('[deepseek SSE clone error]', e));
        }

        // 修复：归一化 DeepSeek SSE 事件名（reasoning_text.delta → reasoning_summary_text.delta 等）
        // 确保 @ai-sdk/openai 的 chunk schema 能匹配并产出 reasoning-delta / tool-call
        return normalizeDeepseekSse(response);
      },
    });
  }
  return instance;
}
