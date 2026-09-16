export type StudioPhase =
  | 'research'
  | 'researching'
  | 'researched'
  | 'plan'
  | 'planning'
  | 'planned'
  | 'draft'
  | 'drafting'
  | 'drafted'
  | 'complete';

export type AngleCard = {
  id: string;
  claim: string;
  conflict: string;
  whyNow: string;
  risk?: string;
};

export type ResearchSource = {
  title: string;
  url: string;
  blurb: string;
  kind: 'fact' | 'view' | 'case';
  /** 来源发布日期（检索可得时有值） */
  publishedAt?: string;
};

export type ResearchStepSnapshot = {
  idea: string;
  audience?: string;
  stance?: string;
  streamText?: string;
  sources: ResearchSource[];
  angles: AngleCard[];
  selectedAngleId?: string;
};

export type PlanStepSnapshot = {
  angleSummary: string;
  beats: string[];
  tone?: string;
  audience?: string;
  titleDirections?: string[];
  bannedWords?: string;
  mustUseDetails?: string;
  streamText?: string;
};

export type ImageSlot = {
  id: string;
  role: 'cover' | 'inline';
  promptDraft: string;
  assetUrl?: string;
  generating?: boolean;
};

export type DraftStepSnapshot = {
  markdown: string;
  titles?: string[];
  styleSamples?: string[];
  tone?: string;
  deAiFlavor?: boolean;
  imageSlots: ImageSlot[];
  imageModel?: string;
  imageAspectRatio?: string;
  imageClarity?: string;
  streamText?: string;
};
