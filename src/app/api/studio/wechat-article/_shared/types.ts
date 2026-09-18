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
    tone?: string;
    audience?: string;
    /** 内容思路中选定的成稿标题。 */
    title?: string;
  };
  tone?: string;
  deAiFlavor?: boolean;
  styleSamples?: string[];
};

export type WechatArticleSseTextEvent = {
  delta: string;
};
