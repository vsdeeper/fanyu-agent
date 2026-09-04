import type { ECOMMERCE_DESIGN_TYPES } from './constants';

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

export type EcommerceDesignType = (typeof ECOMMERCE_DESIGN_TYPES)[number];

export type EcommerceGenerateKind = 'productView' | 'visual' | 'model' | 'design';

type EcommerceGenerateBase = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

/** 产品多视角：表单规格 + 产品图 */
export type EcommerceProductViewGenerateRequest = EcommerceGenerateBase & {
  kind: 'productView';
  count: number;
  images: EcommerceImageInput[];
};

/** 营销主视觉：表单规格 + 商业分析 + 选中产品多视角图 */
export type EcommerceVisualGenerateRequest = EcommerceGenerateBase & {
  kind: 'visual';
  count: number;
  analysisText: string;
  productViewDataUrl: string;
};

/** 产品模特：本步表单 + 选中主视觉 + 可选模特形象；不传分析/产品图 */
export type EcommerceModelGenerateRequest = EcommerceGenerateBase & {
  kind: 'model';
  count: number;
  modelRequirement: string;
  visualDataUrl: string;
  modelImages?: EcommerceImageInput[];
};

/** 视觉设计：表单配置 + 分析结果 + 产品标准图 + 开关控制的视觉/模特标准图 */
export type EcommerceDesignGenerateRequest = EcommerceGenerateBase & {
  kind: 'design';
  count: number;
  designType: EcommerceDesignType;
  referenceVisual: boolean;
  includeModel: boolean;
  analysisText: string;
  productViewDataUrl: string;
  visualDataUrl?: string;
  modelDataUrl?: string;
};

export type EcommerceGenerateRequest =
  | EcommerceProductViewGenerateRequest
  | EcommerceVisualGenerateRequest
  | EcommerceModelGenerateRequest
  | EcommerceDesignGenerateRequest;

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
