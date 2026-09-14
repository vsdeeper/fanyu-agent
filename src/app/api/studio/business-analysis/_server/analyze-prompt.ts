import 'server-only';

/** `buildAnalyzePrompt` 的素材段：一律走具名键，且每段仅在实际有内容时追加。 */
export type AnalyzePromptOptions = {
  /** 产品说明自由文本 */
  productDescription?: string;
  /** 产品资料解析出的正文；没有资料传空串，勿传占位串（否则会写出一条空的「- 产品资料：」） */
  documentsText?: string;
  /** 本轮消息附件中含产品精修图 */
  hasProductImages?: boolean;
  /** 本轮消息附件中含品牌 Logo */
  hasBrandLogo?: boolean;
};

/**
 * 把产品说明、产品资料与「附件含图」提示拼成 streamText 用户文本。
 * 产品图 / Logo 像素由调用方以 file part 附在同一条 user message，不在此转写。
 *
 * 四类素材在商业分析里都是非必填项，故每段都仅在有内容时追加：留一条空的「- 产品资料：」
 * 会让模型以为存在一份空文档。产品图也没有时，改由「未提供产品精修图」一句交代事实来源，
 * 否则模型会按指令里「按画面合理推断」的口径硬编产品本体。
 */
export function buildAnalyzePrompt(options: AnalyzePromptOptions = {}): string {
  const description = options.productDescription?.trim();
  const documentsText = options.documentsText?.trim();
  const hasProductImages = options.hasProductImages === true;
  const hasBrandLogo = options.hasBrandLogo === true;
  return [
    '【工作台商业分析】请按指令输出九段可见 Markdown。本轮不要出图、不要 slots JSON。',
    ...(description ? [`- 产品说明：${description}`] : []),
    ...(documentsText ? [`- 产品资料：${documentsText}`] : []),
    ...(hasBrandLogo
      ? [
          '- 品牌 Logo：用户已提供品牌 Logo 图（见本消息附件），请直接阅读其造型、配色与调性；据此写「品牌关键词」「推荐主色调」与「适合的视觉风格」，不要要求用户补充品牌素材。',
        ]
      : []),
    ...(hasProductImages
      ? ['- 产品精修图：见本消息附件，请直接阅读产品外观、材质、颜色与卖点线索。']
      : [
          '- 未提供产品精修图：产品外观、材质与卖点按产品说明与产品资料推断，并在相关条目点明依据；不得臆造品牌、规格、参数、功效、认证或价格。',
        ]),
  ].join('\n');
}
