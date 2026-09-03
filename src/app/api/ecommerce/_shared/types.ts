/** POST /api/ecommerce/help-write 成功载荷 */
export type EcommerceHelpWriteData = {
  requirement: string;
};

export type EcommerceDesignType = 'main' | 'detail' | 'ad';

/** 出图表单字段，与确认规划步左侧栏对齐；不落会话库 */
export type EcommerceStudioFormInput = {
  designType: EcommerceDesignType;
  platform: string;
  requirement: string;
  language: string;
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: number;
};

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

export type EcommercePlanSlot = {
  index: number;
  title: string;
  marketing: string;
  visual: string;
  copy: string;
  prompt: string;
};

export type EcommerceAnalyzeTextEvent = {
  delta: string;
};

export type EcommerceAnalyzeDoneEvent = Record<string, never>;

export type EcommerceAnalyzeErrorEvent = {
  message: string;
};

export type EcommerceGenerateRequest = EcommerceStudioFormInput & {
  images: EcommerceImageInput[];
  slots: EcommercePlanSlot[];
};

export type EcommerceGenerateImageEvent = {
  index: number;
  url?: string;
  error?: string;
};
