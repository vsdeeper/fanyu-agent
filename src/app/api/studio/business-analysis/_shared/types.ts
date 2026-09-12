import type { StudioImageInput } from '@/app/api/studio/_shared/generate-types';

export type BusinessAnalysisImageInput = StudioImageInput;

export type BusinessAnalysisDocumentInput = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** POST /api/studio/business-analysis/analyze：四项素材均可为空，对齐商业分析左栏 */
export type BusinessAnalysisAnalyzeRequest = {
  images: BusinessAnalysisImageInput[];
  documents?: BusinessAnalysisDocumentInput[];
  /**
   * 品牌 Logo 原图（至多一张）：服务端先经 analyzeImage 转成中文描述再进 prompt。
   * 分析用的主模型在缺省 provider 下看不见像素，故这里只作识图入参，不直接喂给 streamText。
   */
  brandLogoDataUrl?: string;
  /** 产品说明自由文本；与产品资料可并存 */
  productDescription?: string;
};

export type BusinessAnalysisAnalyzeTextEvent = {
  delta: string;
};

export type BusinessAnalysisAnalyzeDoneEvent = Record<string, never>;

export type BusinessAnalysisAnalyzeErrorEvent = {
  message: string;
};
