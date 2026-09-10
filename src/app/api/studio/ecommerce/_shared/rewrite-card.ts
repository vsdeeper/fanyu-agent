import type { MainImageThemeId } from './main-image-plan';
import type { DetailImageThemeId } from './detail-image-plan';

/** 帮写时用于互斥约束的其它主题卡 */
export type RewriteCardPeer = {
  themeId: string;
  title: string;
  requirement: string;
};

/** 帮写任务域；同名 themeId（sellingPoint/feature/scene）在两域职责不同，必须靠 kind 区分 */
export type RewriteCardKind = 'mainImage' | 'detailImage';

/** POST /api/studio/ecommerce/rewrite-card 请求体（主图分支） */
export type MainImageRewriteCardRequest = {
  kind: 'mainImage';
  themeId: MainImageThemeId;
  draft: string;
  otherCards: RewriteCardPeer[];
  analysisText: string;
  /** 补充产品资料正文（第一手产品事实，优先于商业分析）；未上传时省略 */
  productDocumentsText?: string;
};

/** POST /api/studio/ecommerce/rewrite-card 请求体（详情图分支） */
export type DetailImageRewriteCardRequest = {
  kind: 'detailImage';
  themeId: DetailImageThemeId;
  draft: string;
  otherCards: RewriteCardPeer[];
  analysisText: string;
};

/** POST /api/studio/ecommerce/rewrite-card 请求体 */
export type RewriteCardRequest = MainImageRewriteCardRequest | DetailImageRewriteCardRequest;

/** POST /api/studio/ecommerce/rewrite-card 成功载荷 */
export type RewriteCardResult = {
  requirement: string;
};
