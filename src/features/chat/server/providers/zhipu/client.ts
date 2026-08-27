import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/server/env';
import { patchZhipuRequestBody, type ZhipuRequestBody } from './request-patch';
import { normalizeZhipuSse } from './sse';

let instance: ReturnType<typeof createOpenAI> | undefined;

/**
 * 惰性构造智谱客户端：主对话 CHAT_PROVIDER=zhipu 时使用。
 * 自定义 fetch 负责出站请求修补（注入原生 web_search、剥离 OpenAI 专有字段）
 * 与入站 SSE 归一化（thinking 重写为 <think> 标签、搜索结果合成 url_citation 注解）。
 */
export function getZhipuClient() {
  if (!instance) {
    instance = createOpenAI({
      apiKey: requireEnv('ZHIPU_API_KEY'),
      baseURL: requireEnv('ZHIPU_BASE_URL'),
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
  }
  return instance;
}
