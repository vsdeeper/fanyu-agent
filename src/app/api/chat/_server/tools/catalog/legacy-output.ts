import type { VisionAnalysis } from '@/app/api/images/_server/vision';

/**
 * 旧落盘形状兼容归一：重构(多参考/多图)前，generate_image 成功 part 为 { ok:true, assetId, url }（单资产）、
 * analyze_image 成功 part 为 { ok:true, analysis, assetId }（单张），均无 assets/results 数组。
 * convertToModelMessages 重读旧会话时会经 toModelOutput 走到这里，须归一成新形状再消费，否则 .map 崩。
 * 三处(服务端两个 toModelOutput、客户端 GenerateImageBlock)对旧形状的判定必须一致，故集中于此。
 */

export type LegacyImageOutput = {
  ok?: boolean;
  assets?: Array<{ assetId: string }>;
  assetId?: string;
};

/** 归一成功 shape 的图片资产数组：新 assets 优先，否则旧单资产 assetId 兜底成单元素数组。 */
export function normalizeImageAssets(
  output: LegacyImageOutput | undefined,
): Array<{ assetId: string }> {
  if (output?.assets?.length) return output.assets;
  if (output?.assetId) return [{ assetId: output.assetId }];
  return [];
}

export type LegacyAnalyzeOutput = {
  ok?: boolean;
  results?: Array<{ index?: number; assetId?: string; analysis: VisionAnalysis }>;
  analysis?: VisionAnalysis;
  assetId?: string;
};

/** 归一成功 shape 的识图结果数组：新 results 优先，否则旧单张 analysis 兜底成单元素数组。 */
export function normalizeAnalyzeResults(
  output: LegacyAnalyzeOutput | undefined,
): Array<{ index?: number; assetId?: string; analysis: VisionAnalysis }> {
  if (output?.results?.length) return output.results;
  if (output?.analysis)
    return [{ index: undefined, assetId: output.assetId, analysis: output.analysis }];
  return [];
}
