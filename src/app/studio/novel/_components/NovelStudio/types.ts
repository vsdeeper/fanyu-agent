import type { StyleDimensionSelections } from '@/app/studio/_components/StyleDimensionPicker';

/** 小说工作室 UI 阶段：选题调研 → 故事结构 → 写作 → 预览。 */
export type StudioPhase =
  | 'research'
  | 'researching'
  | 'researched'
  | 'structure'
  | 'structuring'
  | 'structured'
  | 'write'
  | 'writing'
  | 'written'
  | 'preview';

export type NovelVolume = 'short' | 'medium' | 'long';

/** 长篇赛道：仅 volume=long 时生效；短中篇忽略。 */
export type NovelLongFormat = 'publish' | 'web';

export type { StyleDimensionSelections };

/** 左栏表单值：与 ControlPanel 的 Form.Item name 一一对应。 */
export type NovelPanelValues = {
  idea: string;
  genres: string[];
  volume: NovelVolume;
  /** 长篇赛道；短中篇可保留默认值但不参与算法。 */
  longFormat: NovelLongFormat;
};

/** 选题卡：调研步点选。 */
export type TopicCard = {
  id: string;
  title: string;
  /** 类型与体量建议，如「现实短篇」。 */
  genreVolume: string;
  why: string;
  core: string;
  risk?: string;
};

/** 短篇或章内节拍。 */
export type StructureBeat = {
  id: string;
  text: string;
};

/** 中长篇章纲条目；title 为章节名（不含「第N章」，由列表按序号生成）。 */
export type StructureChapter = {
  id: string;
  title: string;
  purpose: string;
  /** 章内节拍；生成结构时默认为 []，由章卡「生成节拍」填充。 */
  beats: StructureBeat[];
};

/** 长篇卷纲条目；chapters 在生成卷纲时为 []，由「生成章纲」填充。 */
export type StructureVolume = {
  id: string;
  title: string;
  purpose: string;
  chapters: StructureChapter[];
};

/** 故事结构快照：短篇节拍 / 中篇章纲 / 长篇卷纲。 */
export type StructureSnapshot =
  | { kind: 'short'; synopsis: string; beats: StructureBeat[] }
  | { kind: 'chapters'; chapters: StructureChapter[] }
  | { kind: 'volumes'; volumes: StructureVolume[] };

/** 写作单元正文；unitId 为 chapter.id 或 beat.id。 */
export type WritingUnit = {
  unitId: string;
  body: string;
};

/** 写作快照：短篇用 short；中篇与长篇扁平章/拍用 chapters。 */
export type WritingSnapshot = {
  kind: 'short' | 'chapters';
  units: WritingUnit[];
  /** 正文文风维度选择；可选，仅影响后续生成。 */
  styleSelections?: StyleDimensionSelections;
};

/** 选题调研步骤落盘快照。 */
export type ResearchStepSnapshot = {
  idea: string;
  genres: string[];
  volume: NovelVolume;
  longFormat: NovelLongFormat;
  topics: TopicCard[];
  selectedTopicId?: string;
  streamText?: string;
};

/** 故事结构步骤落盘快照。 */
export type StructureStepSnapshot = StructureSnapshot & {
  streamText?: string;
};

/** 正文写作步骤落盘快照。 */
export type WriteStepSnapshot = WritingSnapshot;
