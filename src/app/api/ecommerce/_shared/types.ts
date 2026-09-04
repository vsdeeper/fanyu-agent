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

export type EcommerceGenerateKind =
  | 'productRefine'
  | 'productMultiview'
  | 'productView'
  | 'productModel'
  | 'visual'
  | 'model'
  | 'design';

type EcommerceGenerateBase = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

/** 产品精修：表单规格、精修要求与原始产品图 */
export type EcommerceProductRefineGenerateRequest = EcommerceGenerateBase & {
  kind: 'productRefine';
  count: number;
  refineRequirement: string;
  images: EcommerceImageInput[];
};

/** 产品多视角：表单规格、多视角要求与选中的精修标准图 */
export type EcommerceProductMultiviewGenerateRequest = EcommerceGenerateBase & {
  kind: 'productMultiview';
  count: number;
  multiviewRequirement: string;
  refinedImageDataUrl: string;
};

/** 产品多视角：表单规格 + 产品图 */
export type EcommerceProductViewGenerateRequest = EcommerceGenerateBase & {
  kind: 'productView';
  count: number;
  images: EcommerceImageInput[];
};

/** 独立产品模特：产品图定品类与风格，可选模特图锁定人物身份 */
export type EcommerceProductModelGenerateRequest = EcommerceGenerateBase & {
  kind: 'productModel';
  count: number;
  viewRequirement: string;
  images: EcommerceImageInput[];
  modelImages?: EcommerceImageInput[];
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

/** 视觉设计：表单配置 + 分析结果 + 产品标准图 + 开关控制的视觉/模特标准图；营销海报可附带可选模特形象 */
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
  modelImages?: EcommerceImageInput[];
};

export type EcommerceGenerateRequest =
  | EcommerceProductRefineGenerateRequest
  | EcommerceProductMultiviewGenerateRequest
  | EcommerceProductViewGenerateRequest
  | EcommerceProductModelGenerateRequest
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
