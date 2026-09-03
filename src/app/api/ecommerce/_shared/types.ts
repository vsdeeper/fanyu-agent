export type EcommerceImageInput = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

export type EcommerceDocumentInput = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** POST /api/ecommerce/analyze：仅产品图与资料，对齐商业分析左栏 */
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

export type EcommerceGenerateKind = 'visual' | 'model';

type EcommerceGenerateBase = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

/** 营销主视觉：表单规格 + 商业分析 + 产品图 */
export type EcommerceVisualGenerateRequest = EcommerceGenerateBase & {
  kind: 'visual';
  count: number;
  analysisText: string;
  images: EcommerceImageInput[];
};

/** 产品模特：本步表单 + 选中主视觉 + 可选模特形象；不传分析/产品图 */
export type EcommerceModelGenerateRequest = EcommerceGenerateBase & {
  kind: 'model';
  modelRequirement: string;
  visualDataUrl: string;
  modelImages?: EcommerceImageInput[];
};

export type EcommerceGenerateRequest =
  EcommerceVisualGenerateRequest | EcommerceModelGenerateRequest;

export type EcommerceGenerateImageEvent = {
  index: number;
  url?: string;
  error?: string;
};

/** POST /api/ecommerce/model-help-write 成功载荷 */
export type EcommerceModelHelpWriteData = {
  modelRequirement: string;
};

/** POST /api/ecommerce/model-help-write 请求体 */
export type EcommerceModelHelpWriteRequest = {
  analysisText: string;
  visualDataUrl: string;
  modelImageDataUrl?: string;
};
