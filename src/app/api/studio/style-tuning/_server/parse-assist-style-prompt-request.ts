import 'server-only';

import { z } from 'zod';
import type { AssistStylePromptRequest } from '../_shared/assist-style-prompt';

const assistStylePromptSchema = z.object({
  styleSamples: z.string().trim().min(1),
});

/** 解析文风提示词帮写请求体；失败返回 null。 */
export function parseAssistStylePromptBody(json: unknown): AssistStylePromptRequest | null {
  const parsed = assistStylePromptSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
