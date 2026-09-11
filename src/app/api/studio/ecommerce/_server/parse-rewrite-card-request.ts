import 'server-only';

import { z } from 'zod';
import { MAIN_IMAGE_THEME_IDS } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import { DETAIL_IMAGE_THEME_IDS } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import type { RewriteCardRequest } from '@/app/api/studio/ecommerce/_shared/rewrite-card';

const peerSchema = z.object({
  themeId: z.string().min(1),
  title: z.string().min(1),
  requirement: z.string(),
});

const mainImageBodySchema = z.object({
  kind: z.literal('mainImage'),
  themeId: z.enum(MAIN_IMAGE_THEME_IDS),
  draft: z.string(),
  otherCards: z.array(peerSchema).max(5),
  analysisText: z.string(),
  mainImageDescription: z.string().optional(),
  productDocumentsText: z.string().optional(),
});

const detailImageBodySchema = z.object({
  kind: z.literal('detailImage'),
  themeId: z.enum(DETAIL_IMAGE_THEME_IDS),
  draft: z.string(),
  otherCards: z.array(peerSchema).max(5),
  analysisText: z.string(),
  productDocumentsText: z.string().optional(),
});

const rewriteCardBodySchema = z.discriminatedUnion('kind', [
  mainImageBodySchema,
  detailImageBodySchema,
]);

/** 校验主图/详情图主题卡帮写请求体；失败返回 null */
export function parseRewriteCardBody(json: unknown): RewriteCardRequest | null {
  const parsed = rewriteCardBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
