import 'server-only';

import type { EcommerceAnalyzeKind } from './parse-analyze-request';

/** `buildAnalyzePrompt` 的可选资料：同型尾参一律走具名键，且每段仅在实际有内容时追加。 */
export type AnalyzePromptOptions = {
  productDocsText?: string;
  /**
   * 品牌 Logo 的识图结果（由 analyzeImage 转成的中文描述）。
   * 有值即代表用户提供了 Logo；识图失败时为 undefined，此时不追加 Logo 段（分析按无品牌素材处理）。
   */
  brandLogoText?: string;
};

/**
 * 把商业分析、品牌 Logo 识图结果与可选产品资料拼成 streamText 的用户 prompt。
 *
 * 商业分析是硬性资料，调用方已在抽取为空时拦截，故直接成段；其余段落仅在有内容时追加。
 */
export function buildAnalyzePrompt(
  kind: EcommerceAnalyzeKind,
  documentsText: string,
  options: AnalyzePromptOptions = {},
): string {
  const headline =
    kind === 'detailImage'
      ? '【详情图结构规划】请按指令输出六个互斥主题卡，每张含设计目标与展示重点。本轮不要出图。'
      : '【主图分析】请按指令输出五个互斥主题卡，每张含设计目标与展示重点，五张互斥。本轮不要出图。';
  const productDocsText = options.productDocsText?.trim();
  const brandLogoText = options.brandLogoText?.trim();
  return [
    headline,
    `- 商业分析：${documentsText}`,
    ...(productDocsText ? [`- 产品资料：${productDocsText}`] : []),
    ...(brandLogoText
      ? [
          '- 品牌 Logo：用户已提供品牌 Logo 图，出图时会直接以它呈现品牌标识，主题卡可直接安排品牌标识的呈现，不要要求用户补充品牌素材。',
          `- 品牌 Logo 识图结果：\n${brandLogoText}`,
        ]
      : []),
  ].join('\n');
}
