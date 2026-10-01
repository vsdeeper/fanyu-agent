import type { BusinessAnalysisDocumentInput } from '@/app/api/studio/business-analysis/_shared/types';

/** 图文内容请求：素材图 / 文本素材 / 内容至少其一。 */
export type ImageTextPlanRequest = {
  materialDataUrls: string[];
  /** TXT / MD（注入正文）或 PDF（多模态直读）等素材文件。 */
  documents?: BusinessAnalysisDocumentInput[];
  /** 用户填写的正文/大纲，用于生成图文页。 */
  content?: string;
};

export type ImageTextSseTextEvent = {
  delta: string;
};

export type ImageTextSseErrorEvent = {
  message: string;
};
