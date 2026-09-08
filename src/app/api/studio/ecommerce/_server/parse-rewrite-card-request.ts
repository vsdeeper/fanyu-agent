import 'server-only';

import { z } from 'zod';
import { DETAIL_IMAGE_THEME_IDS } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import type { RewriteCardRequest } from '@/app/api/studio/ecommerce/_shared/rewrite-card';

const peerSchema = z.object({
  themeId: z.string().min(1),
  title: z.string().min(1),
  requirement: z.string(),
});

const rewriteCardBodySchema = z.object({
  themeId: z.enum(DETAIL_IMAGE_THEME_IDS),
  draft: z.string(),
  otherCards: z.array(peerSchema).max(5),
  analysisText: z.string(),
});

/** 校验详情图主题卡帮写请求体；失败返回 null */
export function parseRewriteCardBody(json: unknown): RewriteCardRequest | null {
  const parsed = rewriteCardBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
