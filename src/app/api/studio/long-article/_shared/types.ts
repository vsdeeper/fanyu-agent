/** 长文写作文体（调研前选定；与文风语气维解耦）。 */
export type LongArticleGenre = 'popular-science' | 'knowledge-story' | 'commentary' | 'narrative';

/** 选题调研请求：想法 / 经历 / 观点至少填一项；文体必填。 */
export type LongArticleResearchRequest = {
  idea?: string;
  experience?: string;
  viewpoint?: string;
  articleGenre: LongArticleGenre;
};

/** 内容思路请求。 */
export type LongArticlePlanRequest = {
  idea?: string;
  experience?: string;
  articleGenre: LongArticleGenre;
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
  /** 正文篇幅下限；有则约束写作要点条数与展开粒度。 */
  lengthLimit?: number;
};

/** 成稿请求。 */
export type LongArticleDraftRequest = {
  idea?: string;
  experience?: string;
  articleGenre: LongArticleGenre;
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
  /** 调研步参考来源；有则成稿末尾须附「参考来源」节。 */
  sources: Array<{
    title: string;
    url: string;
    blurb: string;
    kind: 'fact' | 'view' | 'case';
    publishedAt?: string;
  }>;
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

/** 成稿通顺润色请求。 */
export type LongArticlePolishRequest = {
  markdown: string;
  articleGenre: LongArticleGenre;
  /** 文风提示；有则润色时尽量保留语气质地。 */
  stylePrompt?: string;
};

export type LongArticleSseTextEvent = {
  delta: string;
};
