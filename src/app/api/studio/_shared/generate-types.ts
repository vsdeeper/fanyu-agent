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
  | 'mainImage'
  | 'detailImage';

type StudioGenerateBase = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  /**
   * 本次批次各占位槽的 id，顺序与 `buildGeneratePlan` 的展开顺序逐位对应；
   * 服务端据此把每张图回传给对应槽位（事件按槽位 id 寻址）。客户端出图必传。
   */
  slotIds?: string[];
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

/** 电商主图：规格 + 商业分析 + 可选产品资料正文 + 多张主题文案 + 产品精修图 + 可选参考图 */
export type StudioMainImageGenerateRequest = StudioGenerateBase & {
  kind: 'mainImage';
  count: number;
  analysisText: string;
  /** 补充产品资料正文（第一手产品事实，优先于商业分析）；未上传时省略 */
  productDocumentsText?: string;
  requirements: Array<{
    themeId: string;
    title: string;
    requirement: string;
  }>;
  productViewImages: StudioImageInput[];
  /**
   * 用户点选的主图成品，只作画面文案的字体与配色标准；未点选时省略。
   * 单值而非数组：文案标准参考图至多一张，与 productViewImages 的多图形态刻意区分。
   */
  copyStyleReferenceDataUrl?: string;
  /**
   * 用户上传的品牌 Logo 原图，作参考图数组**末位**（排在 copyStyleReferenceDataUrl 之后）；未上传时省略。
   * 单值而非数组：Logo 至多一张。
   */
  brandLogoDataUrl?: string;
};

/** 电商详情图：规格 + 商业分析 + 可选产品资料正文 + 当前屏主题卡 + 产品精修图 + 可选上一屏 */
export type StudioDetailImageGenerateRequest = StudioGenerateBase & {
  kind: 'detailImage';
  count: number;
  analysisText: string;
  /** 补充产品资料正文（第一手产品事实，优先于商业分析）；未上传时省略 */
  productDocumentsText?: string;
  requirements: Array<{
    themeId: string;
    title: string;
    requirement: string;
  }>;
  productViewImages: StudioImageInput[];
  previousScreenDataUrl?: string;
};

export type StudioGenerateRequest =
  | StudioProductRefineGenerateRequest
  | StudioProductMultiviewGenerateRequest
  | StudioProductViewGenerateRequest
  | StudioProductModelGenerateRequest
  | StudioVisualGenerateRequest
  | StudioDesignGenerateRequest
  | StudioMainImageGenerateRequest
  | StudioDetailImageGenerateRequest;

/** 单张出图结果事件：以占位槽 id 寻址，客户端无需知道批次内位置。 */
export type StudioGenerateImageEvent = {
  slotId: string;
  url?: string;
  error?: string;
};
