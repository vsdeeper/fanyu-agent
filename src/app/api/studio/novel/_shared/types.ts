/** 人物在故事中的位置。 */
export type NovelCharacterRole = 'protagonist' | 'antagonist' | 'supporting';

/** 人物性别。不标明表示这个故事不锁定该人的他/她。 */
export type NovelCharacterGender = 'female' | 'male' | 'unspecified';

/** 语法时态：全书锁定，与文风「时间位置」不是同一根轴。 */
export type NovelTense = 'past' | 'present';

/** 人物在全书中的变化，某一阶段可以空。 */
export type NovelCharacterArc = {
  early?: string;
  mid?: string;
  late?: string;
  end?: string;
};

/** 核心人物。出身、特质必填；变化按阶段可选。 */
export type NovelCharacter = {
  id: string;
  name: string;
  role: NovelCharacterRole;
  /** 旧快照可能还没有；写全并进入下一步前必须选定。 */
  gender?: NovelCharacterGender;
  origin: string;
  trait: string;
  arc?: NovelCharacterArc;
};

/** 关系在故事里的阶段变化，某一阶段可以空。 */
export type NovelRelationArc = {
  early?: string;
  mid?: string;
  late?: string;
};

/** 两人之间的一条关系。 */
export type NovelRelation = {
  fromId: string;
  toId: string;
  label: string;
  arc?: NovelRelationArc;
};

/** 角色设定：只含人物与关系。人称、聚焦、时态在写作步。 */
export type NovelCast = {
  characters: NovelCharacter[];
  relations: NovelRelation[];
};

/** 一条主线在某一卷的推进。 */
export type NovelThreadAdvance = {
  volumeId: string;
  text: string;
};

/** 贯穿全书的主线。 */
export type NovelThread = {
  id: string;
  name: string;
  /** 核心悬念或核心矛盾。 */
  core: string;
  advances: NovelThreadAdvance[];
};

/** 分卷地图上的一卷，尚不含章。 */
export type NovelVolumeOutline = {
  id: string;
  title: string;
  /** 地点、地域或时间跨度。 */
  geography: string;
  conflict: string;
  /** 这一卷结束时多出来的能力、关系或状态。旧快照可能还没有。 */
  outcome?: string;
  targetChars: number;
};

/** 创作方案：主线与分卷。 */
export type NovelPlan = {
  threads: NovelThread[];
  volumes: NovelVolumeOutline[];
};

/** 卷内一章。钩子是悬念、冲突、发现三者之一。 */
export type NovelChapterCard = {
  id: string;
  title: string;
  scene: string;
  event: string;
  hook: string;
};

/** 选题卡。 */
export type NovelTopicCard = {
  id: string;
  title: string;
  /** 类型建议，如「奇幻 · 网文长篇」。 */
  genreVolume: string;
  why: string;
  core: string;
  risk?: string;
};

/** 选题调研上传的文件。TXT/MD 抽正文，PDF 由模型直接阅读。 */
export type NovelIdeaFile = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** 选题调研请求。体系设定必填；想法与创作方案文件可选。 */
export type NovelResearchRequest = {
  idea?: string;
  ideaFiles: NovelIdeaFile[];
  planFile?: NovelIdeaFile;
  genres?: string[];
};

/** 创作方案生成请求。体系设定必填；创作方案文件可选。 */
export type NovelPlanRequest = {
  idea?: string;
  ideaFiles: NovelIdeaFile[];
  planFile?: NovelIdeaFile;
  genres?: string[];
  topic: NovelTopicCard;
};

/** 角色设定生成请求。体系设定必填；创作方案文件可选。 */
export type NovelCastRequest = {
  idea?: string;
  ideaFiles: NovelIdeaFile[];
  planFile?: NovelIdeaFile;
  genres?: string[];
  topic: NovelTopicCard;
  plan: NovelPlan;
};

/** 按卷一次出齐章卡的请求。体系设定必填；创作方案文件可选。 */
export type NovelVolumeChaptersRequest = {
  topic: NovelTopicCard;
  plan: NovelPlan;
  cast: NovelCast;
  ideaFiles: NovelIdeaFile[];
  planFile?: NovelIdeaFile;
  volume: NovelVolumeOutline;
  siblingVolumes?: NovelVolumeOutline[];
};

/** 此前一章：设计卡片，以及已经写下的全文。 */
export type NovelPreviousChapterContext = {
  title: string;
  scene: string;
  event: string;
  hook: string;
  body?: string;
};

/** 正文写作请求。此前各章全文不截断。 */
export type NovelWritingRequest = {
  unitId: string;
  topic: NovelTopicCard;
  plan: NovelPlan;
  cast: NovelCast;
  /** 文风提示词，含人称与聚焦。 */
  stylePrompt?: string;
  tense: NovelTense;
  previousChapters: NovelPreviousChapterContext[];
  chapter: Pick<NovelChapterCard, 'title' | 'scene' | 'event' | 'hook'>;
  /** 下一章只用来卡住边界。 */
  nextChapter?: {
    title: string;
    hook: string;
  };
};

/** 整章通顺润色：改句读、衔接与用词，不改情节。 */
export type NovelPolishRequest = {
  body: string;
  label?: string;
  scene?: string;
  event?: string;
  hook?: string;
  /** 文风提示；有则润色时保留语气质地。 */
  stylePrompt?: string;
};

export type NovelSseTextEvent = {
  delta: string;
};
