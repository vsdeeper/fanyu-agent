import type { StudioImageInput } from '@/app/api/studio/_shared/generate-types';

export type BusinessAnalysisImageInput = StudioImageInput;

export type BusinessAnalysisDocumentInput = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** POST /api/studio/business-analysis/analyze：仅产品图与资料，对齐商业分析左栏 */
export type BusinessAnalysisAnalyzeRequest = {
  images: BusinessAnalysisImageInput[];
  documents?: BusinessAnalysisDocumentInput[];
};

export type BusinessAnalysisAnalyzeTextEvent = {
  delta: string;
};

export type BusinessAnalysisAnalyzeDoneEvent = Record<string, never>;

export type BusinessAnalysisAnalyzeErrorEvent = {
  message: string;
};
