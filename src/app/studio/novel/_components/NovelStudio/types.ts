import type { NovelReasoningEffort } from '@/app/api/studio/novel/_shared/constants';
import type {
  NovelCast,
  NovelChapterCard,
  NovelCharacter,
  NovelCharacterArc,
  NovelCharacterGender,
  NovelCharacterRole,
  NovelPlan,
  NovelRelation,
  NovelRelationArc,
  NovelSection,
  NovelSectionBlock,
  NovelTense,
  NovelThread,
  NovelVolumeAsset,
  NovelVolumeBeat,
  NovelVolumeDesign,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldEntry,
  NovelWorldOrder,
  NovelWorldview,
} from '@/app/api/studio/novel/_shared/types';
import type { ProductDocUploadItem } from '@/app/studio/_components/ProductDocsUpload';
import type { StyleDimensionSelections } from '@/app/studio/_components/StyleDimensionPicker';

/** 小说工作室 UI 阶段：世界观 → 选题 → 方案 → 角色 → 卷纲 → 卷章 → 写作。 */
export type StudioPhase =
  | 'worldview'
  | 'worldviewing'
  | 'worldviewed'
  | 'research'
  | 'researching'
  | 'researched'
  | 'plan'
  | 'planning'
  | 'planned'
  | 'cast'
  | 'casting'
  | 'casted'
  | 'volumes'
  | 'voluming'
  | 'volumed'
  | 'chapters'
  | 'chaptering'
  | 'chaptered'
  | 'write'
  | 'writing'
  | 'written';

export type {
  NovelCharacter,
  NovelCharacterArc,
  NovelCharacterGender,
  NovelCharacterRole,
  NovelChapterCard,
  NovelPlan,
  NovelRelation,
  NovelRelationArc,
  NovelSection,
  NovelSectionBlock,
  NovelTense,
  NovelThread,
  NovelVolumeAsset,
  NovelVolumeBeat,
  NovelVolumeDesign,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldEntry,
  NovelWorldOrder,
  NovelWorldview,
};

export type { StyleDimensionSelections };

/** 左栏表单值。世界观设定必填；创作方案文件与偏好类型可选。 */
export type NovelPanelValues = {
  /** 世界观设定，至多三份。 */
  worldviewFiles: ProductDocUploadItem[];
  /** 创作方案样本，至多一份。只在选题与创作方案两步使用。 */
  planFiles: ProductDocUploadItem[];
  genres: string[];
};

/** 选题卡：调研步点选。 */
export type TopicCard = {
  id: string;
  title: string;
  genreVolume: string;
  why: string;
  core: string;
  risk?: string;
};

/** 卷章设计里的一章。 */
export type StructureChapter = NovelChapterCard;

/** 某一卷下的章卡。 */
export type ChapterVolume = {
  id: string;
  chapters: StructureChapter[];
};

/** 卷章快照。选中的是哪一卷由卷纲快照决定。 */
export type ChaptersSnapshot = {
  volumes: ChapterVolume[];
};

/** 写作单元正文，unitId 使用 chapter.id。 */
export type WritingUnit = {
  unitId: string;
  body: string;
};

/** 正文写作步骤落盘快照。人称、聚焦在 styleSelections 里，时态单独锁定。 */
export type WritingSnapshot = {
  units: WritingUnit[];
  styleSelections?: StyleDimensionSelections;
  tense?: NovelTense;
  selectedUnitIds?: string[];
  focusUnitId?: string;
};

/** 角色设定步骤落盘快照。 */
export type CastStepSnapshot = NovelCast;

/** 模型产出的角色，不含人称与时态。 */
export type CastGenerated = NovelCast;

/** 世界观设定步骤落盘快照。 */
export type WorldviewStepSnapshot = {
  sections: NovelSection[];
  /** 这一步上传的附件，供左栏预填。 */
  files?: ProductDocUploadItem[];
  streamText?: string;
  /** 左栏思考强度。任务级设置，世界观步骤在最前，因此落在这里；对每一步生效。 */
  reasoningEffort?: NovelReasoningEffort;
};

/** 选题调研步骤落盘快照。 */
export type ResearchStepSnapshot = {
  /** 世界观设定附件。旧任务的附件留在这里，供补跑世界观步骤时预填。 */
  worldviewFiles?: ProductDocUploadItem[];
  /** 可选的创作方案样本，至多一份。 */
  planFiles?: ProductDocUploadItem[];
  genres: string[];
  topics: TopicCard[];
  selectedTopicId?: string;
  streamText?: string;
  /** 覆盖对话设置；旧快照缺省按 max。 */
  reasoningEffort: NovelReasoningEffort;
};

/** 创作方案步骤落盘快照。 */
export type PlanStepSnapshot = NovelPlan & {
  streamText?: string;
};

/** 卷纲设计步骤落盘快照。selectedVolumeId 同时决定卷章展示哪一卷、写作包含哪些章卡。 */
export type VolumesStepSnapshot = {
  volumes: NovelVolumeDesign[];
  selectedVolumeId?: string;
  streamText?: string;
};

/** 卷章设计步骤落盘快照。 */
export type ChaptersStepSnapshot = ChaptersSnapshot;

/** 正文写作步骤落盘快照。 */
export type WriteStepSnapshot = WritingSnapshot;
