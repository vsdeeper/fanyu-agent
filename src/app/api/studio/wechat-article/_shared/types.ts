/** 选题调研请求：想法驱动，无补充资料上传。 */
export type WechatArticleResearchRequest = {
  idea: string;
  viewpoint?: string;
};

/** 内容思路请求。 */
export type WechatArticlePlanRequest = {
  idea: string;
  angle: {
    id: string;
    claim: string;
    conflict: string;
    whyNow: string;
    risk?: string;
  };
  sources: Array<{
    title: string;
    url: string;
    blurb: string;
    kind: 'fact' | 'view' | 'case';
    publishedAt?: string;
  }>;
};

/** 成稿请求。 */
export type WechatArticleDraftRequest = {
  idea: string;
  angle: {
    id: string;
    claim: string;
    conflict: string;
    whyNow: string;
    risk?: string;
  };
  plan: {
    beats: string[];
    audience?: string;
    /** 内容思路中选定的成稿标题。 */
    title?: string;
  };
  /** 文风五维卡片拼成的提示文本。 */
  stylePrompt: string;
  /** 正文篇幅下限（去掉空白后的字数）；未传则不限制。 */
  lengthLimit?: number;
};

/** 成稿配图规划请求。 */
export type WechatArticleImagesRequest = {
  markdown: string;
  title?: string;
  /** 可选风格参考图 data URL；有则多模态注入，用于提炼 visualStyle。 */
  styleReferenceDataUrl?: string;
};

export type WechatArticleSseTextEvent = {
  delta: string;
};
