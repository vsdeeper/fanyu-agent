/** 人物在故事中的位置。 */
export type NovelCharacterRole = 'protagonist' | 'antagonist' | 'supporting';

/** 人物性别。不标明表示这个故事不锁定该人的他/她。 */
export type NovelCharacterGender = 'female' | 'male' | 'unspecified';

/** 语法时态：全书锁定，与文风「时间位置」不是同一根轴。 */
export type NovelTense = 'past' | 'present';

/** 核心人物。 */
export type NovelCharacter = {
  id: string;
  name: string;
  role: NovelCharacterRole;
  /** 旧快照可能还没有；写全并进入下一步前必须选定。 */
  gender?: NovelCharacterGender;
  identity: string;
  desire: string;
  flaw: string;
};

/** 两人之间的一条关系。 */
export type NovelRelation = {
  fromId: string;
  toId: string;
  label: string;
};

/** 传给后续步骤的设定：人称、聚焦已压成 voicePrompt。 */
export type NovelBible = {
  characters: NovelCharacter[];
  relations: NovelRelation[];
  /** 故事发生的时间与地点，一句即可。 */
  timePlace: string;
  /** 全书已经成立、不能改口的事实；不限于奇幻或科幻法则。 */
  rules: string[];
  /** 这个故事里不要发生的事。 */
  taboos?: string[];
  tense: NovelTense;
  voicePrompt: string;
};

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

/** 选题调研上传的思路文件。TXT/MD 抽正文，PDF 由模型直接阅读。 */
export type NovelIdeaFile = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** 选题调研请求。想法与思路文件至少有一项。 */
export type NovelResearchRequest = {
  idea?: string;
  ideaFile?: NovelIdeaFile;
  genres?: string[];
  volume: NovelVolume;
  /** 仅长篇使用；缺省按出版。 */
  longFormat?: NovelLongFormat;
};

/** 设定生成请求：只产出人物、世界与禁忌。想法与思路文件至少有一项。 */
export type NovelBibleRequest = {
  idea?: string;
  ideaFile?: NovelIdeaFile;
  genres?: string[];
  volume: NovelVolume;
  longFormat?: NovelLongFormat;
  topic: NovelTopicCard;
};

/** 故事结构请求。想法与思路文件至少有一项。 */
export type NovelStructureRequest = {
  idea?: string;
  ideaFile?: NovelIdeaFile;
  genres?: string[];
  volume: NovelVolume;
  longFormat?: NovelLongFormat;
  topic: NovelTopicCard;
  bible: NovelBible;
};

/** 按卷生成章纲请求。 */
export type NovelVolumeChaptersRequest = {
  topic: NovelTopicCard;
  bible: NovelBible;
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
  bible: NovelBible;
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
  bible: NovelBible;
  volume: NovelVolume;
  longFormat?: NovelLongFormat;
  /** 文风提示词；可选。 */
  stylePrompt?: string;
};

/** 单节拍正文通顺润色：改句读与用词，不改情节。 */
export type NovelPolishRequest = {
  /** 当前节拍正文。 */
  body: string;
  /** 节拍摘要；有则用来守住这一拍要完成的事。 */
  beatText?: string;
  /** 文风提示；有则润色时保留语气质地。 */
  stylePrompt?: string;
};

export type NovelSseTextEvent = {
  delta: string;
};
