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

// 其它卡上限 = 主题数 − 1（本卡自身由 handle 过滤掉），按主题表派生以免加主题后被 400 拒掉
const MAX_MAIN_IMAGE_PEERS = MAIN_IMAGE_THEME_IDS.length - 1;
const MAX_DETAIL_IMAGE_PEERS = DETAIL_IMAGE_THEME_IDS.length - 1;

const mainImageBodySchema = z.object({
  kind: z.literal('mainImage'),
  themeId: z.enum(MAIN_IMAGE_THEME_IDS),
  draft: z.string(),
  otherCards: z.array(peerSchema).max(MAX_MAIN_IMAGE_PEERS),
  analysisText: z.string(),
  mainImageDescription: z.string().optional(),
  productDocumentsText: z.string().optional(),
});

const detailImageBodySchema = z.object({
  kind: z.literal('detailImage'),
  themeId: z.enum(DETAIL_IMAGE_THEME_IDS),
  draft: z.string(),
  otherCards: z.array(peerSchema).max(MAX_DETAIL_IMAGE_PEERS),
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
