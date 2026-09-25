/** 图文内容请求：素材与内容至少其一；素材可选。 */
export type ImageTextPlanRequest = {
  materialDataUrls: string[];
  /** 用户填写的正文/大纲，用于生成图文页。 */
  content?: string;
  /** 可选：对正文结构与详略的补充要求。 */
  contentRequirement?: string;
};

export type ImageTextSseTextEvent = {
  delta: string;
};

export type ImageTextSseErrorEvent = {
  message: string;
};
