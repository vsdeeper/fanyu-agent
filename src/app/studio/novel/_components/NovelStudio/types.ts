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

/** 左栏表单值：与 ControlPanel 的 Form.Item name 一一对应。 */
export type NovelPanelValues = {
  idea: string;
  genres: string[];
  volume: NovelVolume;
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

/** 故事结构快照：短篇节拍 vs 中长篇章纲。 */
export type StructureSnapshot =
  | { kind: 'short'; synopsis: string; beats: StructureBeat[] }
  | { kind: 'chapters'; chapters: StructureChapter[] };

/** 写作单元正文；unitId 为 chapter.id 或 beat.id。 */
export type WritingUnit = {
  unitId: string;
  body: string;
};

/** 写作快照：与 structure.kind 对齐。 */
export type WritingSnapshot = {
  kind: 'short' | 'chapters';
  units: WritingUnit[];
};
