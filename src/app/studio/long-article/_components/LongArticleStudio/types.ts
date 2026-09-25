import type { StudioImageUploadItem } from '@/app/studio/_components/StudioImageUpload';
import type { StyleDimensionSelections } from '@/app/studio/_components/StyleDimensionPicker';

/**
 * 左栏表单值：与 ControlPanel 的 Form.Item name 一一对应。
 *
 * 水印图与风格参考图在服务端契约里仍是单个 URL（`watermarkUrl` / `styleReferenceUrl`），
 * 这里按上传项整数组持有，落盘时取第一张的预览地址。
 */
export type LongArticlePanelValues = {
  idea: string;
  experience: string;
  viewpoint: string;
  styleSelections: StyleDimensionSelections;
  lengthLimit?: number;
  watermarkImages: StudioImageUploadItem[];
  styleReferenceImages: StudioImageUploadItem[];
};

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
  | 'images'
  | 'illustrating'
  | 'illustrated'
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
  experience?: string;
  viewpoint?: string;
  streamText?: string;
  sources: ResearchSource[];
  angles: AngleCard[];
  selectedAngleId?: string;
};

export type PlanStepSnapshot = {
  beats: string[];
  audience?: string;
  titleDirections?: string[];
  /** 选定的标题方向下标，成稿时作为正文标题。 */
  selectedTitleIndex?: number;
  streamText?: string;
};

export type ImageSlot = {
  id: string;
  label: string;
  role: 'cover' | 'inline';
  promptDraft: string;
  /** 本槽生图比例；缺省时用默认 3:2。 */
  aspectRatio?: string;
  /** 本槽生图模型；缺省时用工作室默认。 */
  model?: string;
  /** 本槽清晰度；缺省时跟模型能力回落。 */
  clarity?: string;
  assetUrl?: string;
  generating?: boolean;
};

/** 重新规划后保留的已出图（仅有图项）。 */
export type ImageHistoryItem = {
  id: string;
  assetUrl: string;
  label?: string;
  promptDraft?: string;
};

export type DraftStepSnapshot = {
  markdown: string;
  titles?: string[];
  styleSelections?: StyleDimensionSelections;
  /** 正文篇幅下限（去掉空白后的字数）。 */
  lengthLimit?: number;
  imageSlots: ImageSlot[];
  imageHistory?: ImageHistoryItem[];
  /** 规划配图产出的整套视觉约束；生图时注入。 */
  imageVisualStyle?: string;
  /** 可选风格参考图（data URL 或任务资产 URL）；规划 visualStyle 时纳入。 */
  styleReferenceUrl?: string;
  /** 可选水印图（data URL 或任务资产 URL）；槽位生成出图后叠加到右下角。 */
  watermarkUrl?: string;
  imageModel?: string;
  imageAspectRatio?: string;
  imageClarity?: string;
  streamText?: string;
};
