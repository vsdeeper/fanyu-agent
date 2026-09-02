/** POST /api/ecommerce/help-write 成功载荷 */
export type EcommerceHelpWriteData = {
  requirement: string;
};

export type EcommerceDesignType = 'main' | 'detail' | 'ad';

/** 工作室表单字段，与左侧 ControlPanel 对齐；不落会话库 */
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

export type EcommerceAnalyzeRequest = EcommerceStudioFormInput & {
  images: EcommerceImageInput[];
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

export type EcommerceAnalyzeDoneEvent = {
  slots: EcommercePlanSlot[];
};

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
