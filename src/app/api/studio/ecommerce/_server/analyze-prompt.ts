import 'server-only';

import type { EcommerceAnalyzeKind } from './parse-analyze-request';

/**
 * 把商业分析与可选产品资料拼成 streamText 的用户 prompt；产品资料段仅在非空时追加。
 */
export function buildAnalyzePrompt(
  kind: EcommerceAnalyzeKind,
  documentsText: string,
  productDocsText?: string,
): string {
  const headline =
    kind === 'detailImage'
      ? '【详情图结构规划】请按指令输出六个互斥主题卡，每张含设计目标与展示重点。本轮不要出图。'
      : '【主图分析】请按指令输出五个互斥主题卡，每张含设计目标与展示重点，五张互斥。本轮不要出图。';
  return [
    headline,
    `- 商业分析：${documentsText}`,
    ...(productDocsText ? [`- 产品资料：${productDocsText}`] : []),
  ].join('\n');
}
