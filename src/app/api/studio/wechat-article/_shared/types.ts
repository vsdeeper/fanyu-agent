/** 选题调研请求：想法驱动，无补充资料上传。 */
export type WechatArticleResearchRequest = {
  idea: string;
  audience?: string;
  stance?: string;
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
  bannedWords?: string;
  mustUseDetails?: string;
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
    angleSummary: string;
    beats: string[];
    tone?: string;
    audience?: string;
    titleDirections?: string[];
  };
  tone?: string;
  deAiFlavor?: boolean;
  styleSamples?: string[];
};

export type WechatArticleSseTextEvent = {
  delta: string;
};
