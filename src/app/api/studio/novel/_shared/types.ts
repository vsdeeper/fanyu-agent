/** 体量倾向。 */
export type NovelVolume = 'short' | 'medium' | 'long';

/** 长篇赛道：仅 volume=long 时生效。 */
export type NovelLongFormat = 'publish' | 'web';

/** 选题卡。 */
export type NovelTopicCard = {
  id: string;
  title: string;
  /** 类型与体量建议，如「现实 · 短篇」。 */
  genreVolume: string;
  why: string;
  core: string;
  risk?: string;
};

/** 短篇或章内节拍。 */
export type NovelStructureBeat = {
  id: string;
  text: string;
};

/** 中长篇章纲条目。 */
export type NovelStructureChapter = {
  id: string;
  title: string;
  purpose: string;
  beats: NovelStructureBeat[];
};

/** 长篇卷纲条目。 */
export type NovelStructureVolume = {
  id: string;
  title: string;
  purpose: string;
  chapters: NovelStructureChapter[];
};

/** 故事结构快照。 */
export type NovelStructureSnapshot =
  | { kind: 'short'; synopsis: string; beats: NovelStructureBeat[] }
  | { kind: 'chapters'; chapters: NovelStructureChapter[] }
  | { kind: 'volumes'; volumes: NovelStructureVolume[] };

/** 选题调研请求。 */
export type NovelResearchRequest = {
  idea: string;
  genres?: string[];
  volume: NovelVolume;
  /** 仅长篇使用；缺省按出版。 */
  longFormat?: NovelLongFormat;
};

/** 故事结构请求。 */
export type NovelStructureRequest = {
  idea: string;
  genres?: string[];
  volume: NovelVolume;
  longFormat?: NovelLongFormat;
  topic: NovelTopicCard;
};

/** 按卷生成章纲请求。 */
export type NovelVolumeChaptersRequest = {
  topic: NovelTopicCard;
  longFormat?: NovelLongFormat;
  volume: {
    id: string;
    title: string;
    purpose: string;
  };
  /** 同书其它卷摘要，帮助卷间衔接。 */
  siblingVolumes?: Array<{
    id: string;
    title: string;
    purpose: string;
  }>;
  /** 全书已有章数，便于模型续编章号感（不写进标题）。 */
  existingChapterCount?: number;
};

/** 章内节拍请求。 */
export type NovelChapterBeatsRequest = {
  topic: NovelTopicCard;
  longFormat?: NovelLongFormat;
  chapter: {
    id: string;
    title: string;
    purpose: string;
  };
  /** 可选：同书其它章纲摘要，帮助节拍衔接。 */
  siblingChapters?: Array<{
    id: string;
    title: string;
    purpose: string;
  }>;
};

/** 单单元正文写作请求。 */
export type NovelWritingRequest = {
  unitId: string;
  beatText: string;
  chapterTitle?: string;
  chapterPurpose?: string;
  topic: NovelTopicCard;
  volume: NovelVolume;
  longFormat?: NovelLongFormat;
  /** 文风提示词；可选。 */
  stylePrompt?: string;
};

export type NovelSseTextEvent = {
  delta: string;
};
