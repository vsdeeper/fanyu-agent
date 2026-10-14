/** 人物在故事中的位置。 */
export type NovelCharacterRole = 'protagonist' | 'antagonist' | 'supporting';

/** 人物性别：女或男。 */
export type NovelCharacterGender = 'female' | 'male';

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

/** 角色设定：只含人物与关系。人称、聚焦在写作步的文风里。 */
export type NovelCast = {
  characters: NovelCharacter[];
  relations: NovelRelation[];
};

/** 一层秩序里的一条规则。 */
export type NovelWorldEntry = {
  id: string;
  name: string;
  /** 这条规则怎么运作。 */
  rule: string;
};

/** 一层秩序。地理层、制度、阶层或时间都用这一槽。 */
export type NovelWorldOrder = {
  id: string;
  name: string;
  /** 这一层要回答的问题。 */
  question: string;
  entries: NovelWorldEntry[];
};

/** 按功能归类的物质基础。没有可列举的事物时可以不写。 */
export type NovelWorldAssetGroup = {
  id: string;
  /** 功能，由这个故事自拟。 */
  category: string;
  items: string[];
};

/** 世界观：秩序、隐藏真相与物质基础。 */
export type NovelWorldview = {
  orders: NovelWorldOrder[];
  hiddenTruth: string;
  assets: NovelWorldAssetGroup[];
};

/** 通用两级章节里的二级块：标题与自由正文。 */
export type NovelSectionBlock = {
  title: string;
  body: string;
};

/** 通用两级章节里的一级标题。标题与正文都由这份设定自己的内容决定。 */
export type NovelSection = {
  id: string;
  title: string;
  blocks: NovelSectionBlock[];
};

/** 贯穿全书的主线。不含逐卷推进。 */
export type NovelThread = {
  id: string;
  name: string;
  /** 这条线贯穿全书的走向。 */
  core: string;
};

/** 本卷动用的设定要素，以及它在情节里怎么被使用。旧方案残留。 */
export type NovelVolumeAsset = {
  name: string;
  use: string;
};

/** 旧方案里分卷地图上的一卷。新方案不再写，读取时收成一级标题。 */
export type NovelVolumeOutline = {
  id: string;
  title: string;
  /** 地点、地域或时间跨度。 */
  geography: string;
  conflict: string;
  /** 本卷人物与关系怎么变。 */
  relations: string;
  /** 本卷动用的设定要素。可以空。 */
  assets: NovelVolumeAsset[];
  /** 卷末钩子：发现、反转，或交给下一卷的问题。 */
  hook: string;
  targetChars: number;
};

/**
 * 创作方案：与世界观设定同一套通用两级章节。
 * 主线、终局、主题与世界观是旧方案残留，只读不再写，仍供下游阅读。
 */
export type NovelPlan = {
  sections: NovelSection[];
  threads?: NovelThread[];
  /** 终局：谁做了什么选择，旧秩序怎么变。 */
  ending?: string;
  /** 一句话主题。 */
  theme?: string;
  /** 旧方案内嵌的世界观。世界观已有独立步骤后不再写。 */
  worldview?: NovelWorldview;
};

/** 卷内一拍：这一拍发生的事，以及涉及的角色。 */
export type NovelVolumeBeat = {
  id: string;
  title: string;
  event: string;
  /** 本批角色里的 id。过场人物可以不写。 */
  characterIds: string[];
};

/** 叙事卷纲。方案里的节拍在这里排成一卷内的时间顺序。 */
export type NovelVolumeDesign = {
  id: string;
  title: string;
  /** 回溯到创作方案里的一节。没有对应节时省略。 */
  sourceSectionId?: string;
  conflict: string;
  /** 卷末钩子：交给下一卷的问题。 */
  hook: string;
  beats: NovelVolumeBeat[];
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

/** 世界观设定步上传的文件。TXT/MD 抽正文，PDF 由模型直接阅读。 */
export type NovelIdeaFile = {
  filename: string;
  mediaType: string;
  dataUrl: string;
};

/** 世界观设定请求。附件必填，最多三份。 */
export type NovelWorldviewRequest = {
  ideaFiles: NovelIdeaFile[];
};

/** 选题调研请求。世界观章节必填；创作方案文件可选。 */
export type NovelResearchRequest = {
  worldview: NovelSection[];
  planFile?: NovelIdeaFile;
  genres?: string[];
};

/** 创作方案生成请求。世界观章节必填；创作方案文件可选；每卷字数定这一卷的篇幅。 */
export type NovelPlanRequest = {
  worldview: NovelSection[];
  planFile?: NovelIdeaFile;
  genres?: string[];
  topic: NovelTopicCard;
  volumeChars: number;
};

/** 角色设定生成请求。世界观章节与创作方案必填。 */
export type NovelCastRequest = {
  worldview: NovelSection[];
  topic: NovelTopicCard;
  plan: NovelPlan;
};

/** 卷纲生成请求。世界观章节、选题、方案与角色都带上，不带附件原文。 */
export type NovelVolumesRequest = {
  worldview: NovelSection[];
  topic: NovelTopicCard;
  plan: NovelPlan;
  cast: NovelCast;
  volumeChars: number;
};

/** 按卷一次出齐章卡的请求。其余卷只给标题与卷末钩子，用来卡住边界。 */
export type NovelVolumeChaptersRequest = {
  worldview: NovelSection[];
  topic: NovelTopicCard;
  plan: NovelPlan;
  cast: NovelCast;
  volume: NovelVolumeDesign;
  siblingVolumes?: NovelVolumeDesign[];
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
  worldview: NovelSection[];
  topic: NovelTopicCard;
  plan: NovelPlan;
  cast: NovelCast;
  /** 文风提示词，含人称与聚焦。 */
  stylePrompt?: string;
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
