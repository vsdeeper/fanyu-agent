import 'server-only';

import { z } from 'zod';
import { STUDIO_JOB_KINDS } from '../_shared/job-constants';
import type { CreateStudioJobRequest } from '../_shared/job-types';
import { parseGenerateBody } from './parse-generate-request';
import { splitChatSettings } from './with-chat-settings';

const slotSchema = z.object({
  id: z.string().min(1),
  aspectRatio: z.string().min(1),
  status: z.enum(['pending', 'ready', 'failed']),
  url: z.string().optional(),
  error: z.string().optional(),
  themeId: z.string().optional(),
  themeTitle: z.string().optional(),
});

const pendingSchema = z.object({
  stepKey: z.string().min(1),
  taskType: z.string().optional(),
  slots: z.array(slotSchema),
  form: z.object({
    model: z.string().min(1),
    aspectRatio: z.string().min(1),
    quality: z.string().min(1),
    clarity: z.string().min(1),
    count: z.string().min(1),
    taskType: z.string().optional(),
    textlessVisual: z.boolean().optional(),
    unifyVisualMood: z.boolean().optional(),
  }),
});

const createJobSchema = z.object({
  stepKey: z.string().min(1),
  kind: z.enum(STUDIO_JOB_KINDS),
  pending: pendingSchema,
  body: z.unknown(),
});

/**
 * 校验建作业请求体；须含顶层 settings；内层生图体复用 `parseGenerateBody`。
 * 任一步失败返回 null，由调用方转 400。
 */
export function parseCreateJobBody(json: unknown): CreateStudioJobRequest | null {
  const split = splitChatSettings(json);
  if (!split.ok) return null;
  const parsed = createJobSchema.safeParse(split.rest);
  if (!parsed.success) return null;
  const body = parseGenerateBody(parsed.data.body);
  if (!body) return null;
  return {
    stepKey: parsed.data.stepKey,
    kind: parsed.data.kind,
    pending: parsed.data.pending,
    body,
    settings: split.settings,
  };
}
