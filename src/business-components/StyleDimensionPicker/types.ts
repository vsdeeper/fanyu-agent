/**
 * 文风五维键。与 StyleTuningSoftParams（六维软参数）无任何对应关系，
 * 尤其 languageTexture 同名不同义，勿把两者互相赋值。
 */
export type StyleDimensionKey =
  'narrativeStance' | 'emotionTexture' | 'languageTexture' | 'spacePerspective' | 'themeStyle';

/** 一张文风卡片：tag 拼进提示词，description 只在弹框里给人看。 */
export type StyleDimensionCard = {
  /** 稳定标识；被选过之后不要再改，否则旧任务已选会失效 */
  id: string;
  /** 关键词式标签，会拼进发给服务端的文风文本 */
  tag: string;
  /** 面向作者的解释，不参与派生 */
  description: string;
};

/** 弹框内的「一、二、三」大分类。 */
export type StyleDimensionGroup = {
  /** 分类标题，如「一、叙述者站位」；留空则整组不渲染标题 */
  title: string;
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
