/** 文风维度键（叙事姿态 / 时空编排 / 情感质地 / 语言质地 / 主题风格 / 文体体例）。 */
export type StyleDimensionKey =
  | 'narrativeStance'
  | 'spacePerspective'
  | 'emotionTexture'
  | 'languageTexture'
  | 'themeStyle'
  | 'genre';

/** 一张文风卡片：tag 拼进提示词，description 只在弹框里给人看。 */
export type StyleDimensionCard = {
  /** 稳定标识；被选过之后不要再改，否则旧任务已选会失效 */
  id: string;
  /** 关键词式标签，会拼进发给服务端的文风文本 */
  tag: string;
  /** 面向作者的解释，不参与派生 */
  description: string;
};

/** 弹框内的「一、二、三」大分类，也就是一根独立的轴。 */
export type StyleDimensionGroup = {
  /** 分类标题，如「一、按「人称」分」，只做弹框分组标题 */
  title: string;
  /** 轴的短名，拼进提示词作前缀，如「人称」→「人称=第三人称」 */
  label: string;
  /**
   * 该轴是否互斥：true 表示组内只能选一张（温度、收束方式这类一根连续轴）；
   * false 表示可叠加（词汇、意象这类彼此不冲突的并列要求）。
   */
  exclusive: boolean;
  cards: readonly StyleDimensionCard[];
};

/** 一个文风维度：入口名 + 分组卡片库。 */
export type StyleDimension = {
  key: StyleDimensionKey;
  /** 入口与弹框标题，如「叙事姿态」 */
  label: string;
  groups: readonly StyleDimensionGroup[];
};

/** 已选卡片：维度 → 卡片 id。空维度不落键。 */
export type StyleDimensionSelections = Partial<Record<StyleDimensionKey, string[]>>;

/** 粘贴进来的文风 JSON 校验不过的原因。文案见 StyleClipboardActions/constants.ts。 */
export type StylePayloadError =
  /** 不是合法 JSON */
  | 'invalid-json'
  /** 能解析，但不是「维度 → 卡片 id 数组」的形状 */
  | 'invalid-shape'
  /** 含当前卡片库里没有的 id，多半来自别的版本 */
  | 'unknown-card'
  /** 同一互斥轴上选了两张，粘贴方会与复制方不一致 */
  | 'axis-conflict'
  /** 形状合法但一张有效卡片都没有 */
  | 'empty';

/** 文风 JSON 校验结果。 */
export type StylePayloadResult =
  { ok: true; selections: StyleDimensionSelections } | { ok: false; error: StylePayloadError };
