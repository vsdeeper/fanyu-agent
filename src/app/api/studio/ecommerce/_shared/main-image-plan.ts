import { themeIdByTitle as themeIdByTitleFromList } from './theme-plan';

export type { ThemePlanCard } from './theme-plan';

/** 由分析指令规划产出、参与互斥划分的五个主题；不含用户自填的「规格主图」。 */
export const MAIN_IMAGE_ANALYZE_THEME_IDS = [
  'product',
  'sellingPoint',
  'feature',
  'scene',
  'value',
] as const;

export type MainImageAnalyzeThemeId = (typeof MAIN_IMAGE_ANALYZE_THEME_IDS)[number];

/** 用户自填的「规格主图」：分析不产出，要求由用户输入或 AI 帮写。 */
export const MAIN_IMAGE_SPEC_THEME_ID = 'spec';
export const MAIN_IMAGE_SPEC_THEME = { id: MAIN_IMAGE_SPEC_THEME_ID, title: '规格主图' } as const;

export const MAIN_IMAGE_THEME_IDS = [
  ...MAIN_IMAGE_ANALYZE_THEME_IDS,
  MAIN_IMAGE_SPEC_THEME_ID,
] as const;

export type MainImageThemeId = (typeof MAIN_IMAGE_THEME_IDS)[number];

export const MAIN_IMAGE_THEMES: readonly { id: MainImageThemeId; title: string }[] = [
  { id: 'product', title: '产品展示' },
  { id: 'sellingPoint', title: '核心卖点' },
  { id: 'feature', title: '功能特点' },
  { id: 'scene', title: '使用场景' },
  { id: 'value', title: '用户价值' },
  // 标题单源于上面的常量：主题标题就是解析锚点，两处各写一遍会漂移
  MAIN_IMAGE_SPEC_THEME,
] as const;

export type MainImagePlanCard = {
  themeId: MainImageThemeId;
  title: string;
  requirement: string;
};

/** 按固定主题标题解析 themeId；无法识别则返回 null */
export function themeIdByTitle(title: string): MainImageThemeId | null {
  return themeIdByTitleFromList(title, MAIN_IMAGE_THEMES);
}
