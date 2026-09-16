import 'server-only';

import { z } from 'zod';
import type {
  WechatArticleDraftRequest,
  WechatArticlePlanRequest,
  WechatArticleResearchRequest,
} from '../_shared/types';

const angleSchema = z.object({
  id: z.string().trim().min(1),
  claim: z.string().trim().min(1),
  conflict: z.string().trim().min(1),
  whyNow: z.string().trim().min(1),
  risk: z.string().trim().optional(),
});

const sourceSchema = z.object({
  title: z.string().trim().min(1),
  url: z.string().trim().url(),
  blurb: z.string().trim().min(1),
  kind: z.enum(['fact', 'view', 'case']),
  publishedAt: z.string().trim().min(1).optional(),
});

const researchSchema = z.object({
  idea: z.string().trim().min(1),
  audience: z.string().trim().optional(),
  stance: z.string().trim().optional(),
});

const planSchema = z.object({
  idea: z.string().trim().min(1),
  angle: angleSchema,
  sources: z.array(sourceSchema),
  bannedWords: z.string().trim().optional(),
  mustUseDetails: z.string().trim().optional(),
});

const draftSchema = z.object({
  idea: z.string().trim().min(1),
  angle: angleSchema,
  plan: z.object({
    angleSummary: z.string().trim().min(1),
    beats: z.array(z.string().trim().min(1)).min(1),
    tone: z.string().trim().optional(),
    audience: z.string().trim().optional(),
    titleDirections: z.array(z.string().trim().min(1)).optional(),
  }),
  tone: z.string().trim().optional(),
  deAiFlavor: z.boolean().optional(),
  styleSamples: z.array(z.string()).max(3).optional(),
});

/** 解析选题调研请求体；失败返回 null。 */
export function parseResearchBody(json: unknown): WechatArticleResearchRequest | null {
  const parsed = researchSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析内容思路请求体；失败返回 null。 */
export function parsePlanBody(json: unknown): WechatArticlePlanRequest | null {
  const parsed = planSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析成稿请求体；失败返回 null。 */
export function parseDraftBody(json: unknown): WechatArticleDraftRequest | null {
  const parsed = draftSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
