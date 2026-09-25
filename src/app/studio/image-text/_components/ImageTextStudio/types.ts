import type { GenerateSpecFields } from '@/app/studio/_utils/model-options';
import type { StudioImageUploadItem } from '@/app/studio/_components/StudioImageUpload';

/** 工作台步骤。生成内容中单独标出，生图进行中仍停在生成步。 */
export type ImageTextPhase = 'plan' | 'planning' | 'planned' | 'generate' | 'preview';

/** 落在内容快照里的当前步骤，刷新后用来回到生成或预览。 */
export type ImageTextView = 'plan' | 'generate' | 'preview';

/** 旧任务多卡片结构；新内容步只读兼容，不再写入。 */
export type ImageTextCard = {
  id: string;
  title: string;
  prompt: string;
  caption: string;
};

export type ImageTextGeneratedImage = {
  id: string;
  cardId: string;
  aspectRatio: string;
  url: string;
  selected: boolean;
  createdAt: string;
  /** 出图时的标题，供画廊与预览展示。 */
  cardTitle?: string;
  /** 出图时的配文快照（旧任务可能带）；预览配文以内容步 caption 为准。 */
  cardCaption?: string;
};

export type ImageTextPlanSnapshot = {
  /** 用户填写的输入内容；旧任务可能落在 requirement。 */
  content: string;
  materialUrls: string[];
  /** 可选：对正文结构与详略的补充要求。 */
  contentRequirement?: string;
  /** 模型整理后的图文卡片正文（Markdown）。 */
  body: string;
  /**
   * 预览用固定配文（从标题后的 `> 摘要` 提炼）；不随预览图切换，也不参与生图提示。
   */
  caption: string;
  /**
   * 旧任务可能仍带生图页；新内容步落盘恒为空数组。
   */
  cards: ImageTextCard[];
  selectedCardId?: string;
  view: ImageTextView;
  streamText?: string;
};

export type ImageTextGenerateSnapshot = {
  model: string;
  aspectRatio: string;
  clarity: string;
  images: ImageTextGeneratedImage[];
  /** 可选视觉参考图。 */
  styleReferenceUrl?: string;
  /** 可选人物模特参考图。 */
  characterModelUrl?: string;
  /** 可选人物相关补充要求。 */
  characterRequirement?: string;
};

export type ImageTextPanelValues = {
  materials: StudioImageUploadItem[];
  content: string;
  /** 可选：内容步对正文结构与详略的补充要求。 */
  contentRequirement: string;
  styleReferenceImages: StudioImageUploadItem[];
  characterModelImages: StudioImageUploadItem[];
  /** 可选：人物模特补充要求。 */
  characterRequirement: string;
  /** 生成步出图规格。 */
  spec: GenerateSpecFields;
};

/** 仅按比例分组的已出图。 */
export type ImageTextRatioGroup = {
  ratio: string;
  images: ImageTextGeneratedImage[];
};

export type ImageTextPreviewSlide = {
  id: string;
  url: string;
  title: string;
};
