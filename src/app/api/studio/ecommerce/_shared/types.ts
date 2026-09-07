import type { StudioImageInput } from '@/app/api/studio/_shared/generate-types';

export type EcommerceImageInput = StudioImageInput;

export type EcommerceDocumentInput = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** POST /api/studio/ecommerce/analyze：仅产品图与资料，对齐商业分析左栏 */
export type EcommerceAnalyzeRequest = {
  images: EcommerceImageInput[];
  documents?: EcommerceDocumentInput[];
};

export type EcommerceAnalyzeTextEvent = {
  delta: string;
};

export type EcommerceAnalyzeDoneEvent = Record<string, never>;

export type EcommerceAnalyzeErrorEvent = {
  message: string;
};
