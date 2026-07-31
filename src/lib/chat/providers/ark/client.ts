import { createOpenAI } from '@ai-sdk/openai';

import { requireEnv } from '@/lib/shared/env';
import { patchArkRequestBody, type ArkRequestBody } from './request-patch';
import { normalizeArkResponsesSse } from './sse';

export const ark = createOpenAI({
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

    // 修复：注入 annotation.added，否则 sendSources 也拿不到 source-url
    return normalizeArkResponsesSse(response);
  },
});
