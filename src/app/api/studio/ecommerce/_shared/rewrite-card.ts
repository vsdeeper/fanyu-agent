import type { DetailImageThemeId } from './detail-image-plan';

/** 帮写时用于互斥约束的其它主题卡 */
export type RewriteCardPeer = {
  themeId: string;
  title: string;
  requirement: string;
};

/** POST /api/studio/ecommerce/rewrite-card 请求体 */
export type RewriteCardRequest = {
  themeId: DetailImageThemeId;
  draft: string;
  otherCards: RewriteCardPeer[];
  analysisText: string;
};

/** POST /api/studio/ecommerce/rewrite-card 成功载荷 */
export type RewriteCardResult = {
  requirement: string;
};
