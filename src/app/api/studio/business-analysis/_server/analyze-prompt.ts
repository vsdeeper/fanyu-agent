import 'server-only';

/** `buildAnalyzePrompt` 的素材段：一律走具名键，且每段仅在实际有内容时追加。 */
export type AnalyzePromptOptions = {
  /** 产品说明自由文本 */
  productDescription?: string;
  /** 产品资料解析出的正文；没有资料传空串，勿传占位串（否则会写出一条空的「- 产品资料：」） */
  documentsText?: string;
  /** 产品精修图的识图结果；为空表示本轮没有产品图，或产品图全部识图失败 */
  visionText?: string;
  /**
   * 品牌 Logo 的识图结果（由 analyzeImage 转成的中文描述）。
   * 有值即代表用户提供了 Logo；识图失败时为 undefined，此时不追加 Logo 段（分析按无品牌素材处理）。
   */
  brandLogoText?: string;
};

/**
 * 把产品说明、产品资料、品牌 Logo 与产品图识图结果拼成 streamText 的用户 prompt。
 *
 * 四类素材在商业分析里都是非必填项，故每段都仅在有内容时追加：留一条空的「- 产品资料：」
 * 会让模型以为存在一份空文档。产品图也没有时，改由「未提供产品精修图」一句交代事实来源，
 * 否则模型会按指令里「按识图合理推断」的口径硬编产品本体。
 */
export function buildAnalyzePrompt(options: AnalyzePromptOptions = {}): string {
  const description = options.productDescription?.trim();
  const documentsText = options.documentsText?.trim();
  const visionText = options.visionText?.trim();
  const brandLogoText = options.brandLogoText?.trim();
  return [
    '【工作台商业分析】请按指令输出九段可见 Markdown。本轮不要出图、不要 slots JSON。',
    ...(description ? [`- 产品说明：${description}`] : []),
    ...(documentsText ? [`- 产品资料：${documentsText}`] : []),
    ...(brandLogoText
      ? [
          '- 品牌 Logo：用户已提供品牌 Logo 图，它是品牌调性的事实来源；据此写「品牌关键词」「推荐主色调」与「适合的视觉风格」，不要要求用户补充品牌素材。',
          `- 品牌 Logo 识图结果：\n${brandLogoText}`,
        ]
      : []),
    ...(visionText
      ? [visionText]
      : [
          '- 未提供产品精修图：产品外观、材质与卖点按产品说明与产品资料推断，并在相关条目点明依据；不得臆造品牌、规格、参数、功效、认证或价格。',
        ]),
  ].join('\n');
}
