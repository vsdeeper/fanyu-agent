import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/server/env';
import { patchArkRequestBody, type ArkRequestBody } from './request-patch';
import { normalizeArkResponse } from './sse';

let instance: ReturnType<typeof createOpenAI> | undefined;

/**
 * 惰性构造方舟客户端：主对话 CHAT_PROVIDER=ark、以及方舟 Seedream 生图路径读取 ARK_*。
 * 自定义 fetch 负责出站请求修补（兼容方舟 Responses API）与入站响应归一化
 * （SSE 注入 annotation.added；JSON 补全 annotations=[]）。
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

        // 修复：SSE 注入 annotation.added；非流式 JSON 补 annotations，否则 Zod 报 Invalid JSON
        return normalizeArkResponse(response);
      },
    });
  }
  return instance;
}
