import 'server-only';

import { z } from 'zod';
import type {
  WechatArticleDraftRequest,
  WechatArticleImagesRequest,
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

const researchSchema = z
  .object({
    idea: z.string().trim().optional().default(''),
    experience: z.string().trim().optional(),
    viewpoint: z.string().trim().optional(),
  })
  .refine((value) => Boolean(value.idea || value.experience || value.viewpoint));

const planSchema = z.object({
  idea: z.string().trim().optional().default(''),
  experience: z.string().trim().optional(),
  angle: angleSchema,
  sources: z.array(sourceSchema),
});

const draftSchema = z.object({
  idea: z.string().trim().optional().default(''),
  experience: z.string().trim().optional(),
  angle: angleSchema,
  plan: z.object({
    beats: z.array(z.string().trim().min(1)).min(1),
    audience: z.string().trim().optional(),
    title: z.string().trim().min(1).optional(),
  }),
  stylePrompt: z.string().trim().min(1),
  lengthLimit: z.number().int().min(100).max(20000).optional(),
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

const imagesSchema = z.object({
  markdown: z.string().trim().min(1),
  title: z.string().trim().min(1).optional(),
  styleReferenceDataUrl: z.string().startsWith('data:image/').optional(),
});

/** 解析成稿请求体；失败返回 null。 */
export function parseDraftBody(json: unknown): WechatArticleDraftRequest | null {
  const parsed = draftSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析成稿配图规划请求体；失败返回 null。 */
export function parseImagesBody(json: unknown): WechatArticleImagesRequest | null {
  const parsed = imagesSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
