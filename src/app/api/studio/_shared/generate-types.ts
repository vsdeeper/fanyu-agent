export type StudioImageInput = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

export type StudioGenerateKind =
  | 'productRefine'
  | 'productMultiview'
  | 'productView'
  | 'productModel'
  | 'visual'
  | 'design'
  | 'mainImage';

type StudioGenerateBase = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
};

/** 产品精修：表单规格、精修要求与原始产品图 */
export type StudioProductRefineGenerateRequest = StudioGenerateBase & {
  kind: 'productRefine';
  count: 1;
  refineRequirement: string;
  images: StudioImageInput[];
};

/** 产品多视角：表单规格、多视角要求与选中的精修标准图 */
export type StudioProductMultiviewGenerateRequest = StudioGenerateBase & {
  kind: 'productMultiview';
  count: 1;
  multiviewRequirement: string;
  refinedImageDataUrls: string[];
};

/** 产品多视角：表单规格 + 产品图 */
export type StudioProductViewGenerateRequest = StudioGenerateBase & {
  kind: 'productView';
  count: number;
  images: StudioImageInput[];
};

/** 独立产品模特：产品图定品类与风格，可选模特图锁定人物身份 */
export type StudioProductModelGenerateRequest = StudioGenerateBase & {
  kind: 'productModel';
  count: number;
  viewRequirement: string;
  images: StudioImageInput[];
  modelImages?: StudioImageInput[];
};

/** 营销主视觉：表单规格 + 商业分析正文 + 产品图 */
export type StudioVisualGenerateRequest = StudioGenerateBase & {
  kind: 'visual';
  count: number;
  analysisText: string;
  productViewImages: StudioImageInput[];
};

/** 视觉设计：表单配置 + 分析结果 + 全部产品图 + 已选主视觉 + 可选模特标准图 */
export type StudioDesignGenerateRequest = StudioGenerateBase & {
  kind: 'design';
  count: number;
  taskType: string;
  includeModel: boolean;
  analysisText: string;
  productViewImages: StudioImageInput[];
  visualDataUrl: string;
  modelImages?: StudioImageInput[];
};

/** 电商主图：规格 + 商业分析 + 多张主题文案 + 产品精修图 */
export type StudioMainImageGenerateRequest = StudioGenerateBase & {
  kind: 'mainImage';
  count: number;
  analysisText: string;
  requirements: Array<{
    themeId: string;
    title: string;
    requirement: string;
  }>;
  productViewImages: StudioImageInput[];
};

export type StudioGenerateRequest =
  | StudioProductRefineGenerateRequest
  | StudioProductMultiviewGenerateRequest
  | StudioProductViewGenerateRequest
  | StudioProductModelGenerateRequest
  | StudioVisualGenerateRequest
  | StudioDesignGenerateRequest
  | StudioMainImageGenerateRequest;

export type StudioGenerateImageEvent = {
  index: number;
  url?: string;
  error?: string;
};
