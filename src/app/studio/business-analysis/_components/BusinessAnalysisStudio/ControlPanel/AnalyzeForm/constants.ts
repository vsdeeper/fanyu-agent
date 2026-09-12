/** 品牌 Logo（分析步左栏，可选，至多一张）；服务端先识图再进 prompt，据此写品牌关键词与主色调 */
export const BRAND_LOGO_LABEL = '品牌 Logo';
export const BRAND_LOGO_SUBTITLE = '可选，透出品牌调性';
export const BRAND_LOGO_HINT = '上传品牌 Logo 原图（透明底 PNG 最佳）';
export const BRAND_LOGO_ARIA_LABEL = '上传品牌 Logo';

/** 产品精修图非必填：没有时分析按产品说明与产品资料推断 */
export const PRODUCT_IMAGE_LABEL = '产品精修图';
export const PRODUCT_IMAGE_SUBTITLE = '可选，有产品图时按它识别产品';

/**
 * 产品资料上传的提示语。
 * 不能沿用组件默认值（「可上传产品说明、卖点清单或品牌资料」）——本表单另有「产品说明」文本框，同名会让用户分不清该往哪填。
 */
export const PRODUCT_DOCS_HINT = '上传产品资料 TXT / MD';

/** 产品说明：自由文本，与产品资料可并存 */
export const PRODUCT_DESCRIPTION_LABEL = '产品说明';
export const PRODUCT_DESCRIPTION_PLACEHOLDER =
  '例如：主打轻量便携，客群是通勤上班族，突出材质与做工，不要促销大字';
export const PRODUCT_DESCRIPTION_HINT = '可选，与产品资料可同时填写';
