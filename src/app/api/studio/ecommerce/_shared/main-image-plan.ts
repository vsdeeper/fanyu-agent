export const MAIN_IMAGE_THEME_IDS = [
  'product',
  'sellingPoint',
  'feature',
  'scene',
  'value',
] as const;

export type MainImageThemeId = (typeof MAIN_IMAGE_THEME_IDS)[number];

export const MAIN_IMAGE_THEMES: readonly { id: MainImageThemeId; title: string }[] = [
  { id: 'product', title: '产品展示' },
  { id: 'sellingPoint', title: '核心卖点' },
  { id: 'feature', title: '功能特点' },
  { id: 'scene', title: '使用场景' },
  { id: 'value', title: '用户价值' },
] as const;

export type MainImagePlanCard = {
  themeId: MainImageThemeId;
  title: string;
  requirement: string;
};

/** 按固定主题标题解析 themeId；无法识别则返回 null */
export function themeIdByTitle(title: string): MainImageThemeId | null {
  const normalized = title.trim();
  const found = MAIN_IMAGE_THEMES.find((theme) => theme.title === normalized);
  return found?.id ?? null;
}
