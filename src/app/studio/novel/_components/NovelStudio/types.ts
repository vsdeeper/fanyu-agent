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
  NovelTense,
  NovelThread,
  NovelVolumeAsset,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldEntry,
  NovelWorldOrder,
  NovelWorldview,
} from '@/app/api/studio/novel/_shared/types';
import type { ProductDocUploadItem } from '@/app/studio/_components/ProductDocsUpload';
import type { StyleDimensionSelections } from '@/app/studio/_components/StyleDimensionPicker';

/** 小说工作室 UI 阶段：选题调研 → 创作方案 → 角色设定 → 卷章设计 → 写作 → 预览。 */
export type StudioPhase =
  | 'research'
  | 'researching'
  | 'researched'
  | 'plan'
  | 'planning'
  | 'planned'
  | 'cast'
  | 'casting'
  | 'casted'
  | 'chapters'
  | 'chaptering'
  | 'chaptered'
  | 'write'
  | 'writing'
  | 'written'
  | 'preview';

export type {
  NovelCharacter,
  NovelCharacterArc,
  NovelCharacterGender,
  NovelCharacterRole,
  NovelChapterCard,
  NovelPlan,
  NovelRelation,
  NovelRelationArc,
  NovelTense,
  NovelThread,
  NovelVolumeAsset,
  NovelVolumeOutline,
  NovelWorldAssetGroup,
  NovelWorldEntry,
  NovelWorldOrder,
  NovelWorldview,
};

export type { StyleDimensionSelections };

/** 左栏表单值。体系设定必填；想法与创作方案文件可选。 */
export type NovelPanelValues = {
  idea: string;
  /** 体系设定，至多三份。 */
  ideaFiles: ProductDocUploadItem[];
  /** 创作方案，至多一份。 */
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

/** 某一卷下的章卡。卷的标题与冲突来自创作方案。 */
export type ChapterVolume = {
  id: string;
  chapters: StructureChapter[];
};

/** 卷章快照。selectedVolumeId 是进入写作前点选的那一卷。 */
export type ChaptersSnapshot = {
  volumes: ChapterVolume[];
  selectedVolumeId?: string;
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

/** 选题调研步骤落盘快照。 */
export type ResearchStepSnapshot = {
  idea: string;
  /** 体系设定。previewUrl 为站内资产地址或 data URL。 */
  ideaFiles?: ProductDocUploadItem[];
  /** 可选的创作方案文件，至多一份。 */
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

/** 卷章设计步骤落盘快照。 */
export type ChaptersStepSnapshot = ChaptersSnapshot;

/** 正文写作步骤落盘快照。 */
export type WriteStepSnapshot = WritingSnapshot;
