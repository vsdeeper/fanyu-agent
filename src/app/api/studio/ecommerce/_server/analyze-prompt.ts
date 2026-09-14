import 'server-only';

import type { EcommerceAnalyzeKind } from './parse-analyze-request';

/** `buildAnalyzePrompt` 的可选资料：同型尾参一律走具名键，且每段仅在实际有内容时追加。 */
export type AnalyzePromptOptions = {
  productDocsText?: string;
  /** 本轮消息附件中含品牌 Logo */
  hasBrandLogo?: boolean;
};

/**
 * 把商业分析、可选产品资料与「附件含 Logo」提示拼成 streamText 用户文本。
 * Logo 像素由调用方以 file part 附在同一条 user message，不在此转写。
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
      ? '【详情图结构规划】请按指令先输出「视觉气质摘要」，再输出六个互斥主题卡，每张含设计目标、画面文案与展示重点。本轮不要出图。'
      : '【主图分析】请按指令先输出「视觉气质摘要」，再输出五个互斥主题卡，每张含设计目标、画面文案与展示重点，五张互斥。本轮不要出图。';
  const productDocsText = options.productDocsText?.trim();
  const hasBrandLogo = options.hasBrandLogo === true;
  return [
    headline,
    `- 商业分析：${documentsText}`,
    ...(productDocsText ? [`- 产品资料：${productDocsText}`] : []),
    ...(hasBrandLogo
      ? [
          '- 品牌 Logo：用户已提供品牌 Logo 图（见本消息附件），请直接阅读其造型与配色；出图时会直接以它呈现品牌标识，主题卡可直接安排品牌标识的呈现，不要要求用户补充品牌素材。',
        ]
      : []),
  ].join('\n');
}
