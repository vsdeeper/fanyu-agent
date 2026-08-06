import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/env';

let instance: ReturnType<typeof createOpenAI> | undefined;

/**
 * 惰性构造 DeepSeek 客户端：仅当 CHAT_PROVIDER=deepseek 时才读取 DEEPSEEK_* 环境变量。
 * DeepSeek 遵循 OpenAI 协议，无需请求修补与 SSE 归一化。
 */
export function getDeepseekClient() {
  if (!instance) {
    instance = createOpenAI({
      apiKey: requireEnv('DEEPSEEK_API_KEY'),
      baseURL: requireEnv('DEEPSEEK_BASE_URL'),
    });
  }
  return instance;
}
