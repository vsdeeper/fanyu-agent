/** 选题调研请求：想法 / 经历 / 观点至少填一项。 */
export type LongArticleResearchRequest = {
  idea?: string;
  experience?: string;
  viewpoint?: string;
};

/** 内容思路请求。 */
export type LongArticlePlanRequest = {
  idea?: string;
  experience?: string;
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
export type LongArticleDraftRequest = {
  idea?: string;
  experience?: string;
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
  /** 文风卡片拼成的提示文本，形如「叙事姿态：人称=第三人称；态度=低调陈述」。 */
  stylePrompt: string;
  /** 正文篇幅下限（去掉空白后的字数）；未传则不限制。 */
  lengthLimit?: number;
};

/** 成稿配图规划请求。 */
export type LongArticleImagesRequest = {
  markdown: string;
  title?: string;
  /** 可选风格参考图 data URL；有则多模态注入，用于提炼 visualStyle。 */
  styleReferenceDataUrl?: string;
};

export type LongArticleSseTextEvent = {
  delta: string;
};
