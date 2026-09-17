import 'server-only';

import { z } from 'zod';
import { STYLE_TUNING_PUBLISH_SCENES } from '../_shared/constants';
import type { StyleTuningSoftTuneRequest, StyleTuningTrialWriteRequest } from '../_shared/types';

const softParamsSchema = z.object({
  rolePersona: z.string().trim().min(1),
  viewpointNarration: z.string().trim().min(1),
  languageTexture: z.string().trim().min(1),
  rhythmStructure: z.string().trim().min(1),
  emotionTemperature: z.string().trim().min(1),
  goalsConstraints: z.string().trim().min(1),
});

const softTuneSchema = z.object({
  publishScene: z.enum(STYLE_TUNING_PUBLISH_SCENES),
  topicContent: z.string().trim().min(1),
  stylePrompt: z.string().trim().min(1),
});

const trialWriteSchema = z.object({
  publishScene: z.enum(STYLE_TUNING_PUBLISH_SCENES),
  softParams: softParamsSchema,
  topicContent: z.string().trim().min(1),
  contentOutline: z.string().trim().optional(),
});

/** 解析软调请求体；失败返回 null。 */
export function parseSoftTuneBody(json: unknown): StyleTuningSoftTuneRequest | null {
  const parsed = softTuneSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析试写请求体；失败返回 null。 */
export function parseTrialWriteBody(json: unknown): StyleTuningTrialWriteRequest | null {
  const parsed = trialWriteSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
