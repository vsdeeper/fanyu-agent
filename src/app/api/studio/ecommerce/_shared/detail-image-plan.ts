export const DETAIL_IMAGE_THEME_IDS = [
  'brand',
  'sellingPoint',
  'detail',
  'feature',
  'scene',
  'reason',
] as const;

export type DetailImageThemeId = (typeof DETAIL_IMAGE_THEME_IDS)[number];

export const DETAIL_IMAGE_THEMES: readonly { id: DetailImageThemeId; title: string }[] = [
  { id: 'brand', title: '品牌认知' },
  { id: 'sellingPoint', title: '核心卖点' },
  { id: 'detail', title: '产品细节' },
  { id: 'feature', title: '功能展示' },
  { id: 'scene', title: '使用场景' },
  { id: 'reason', title: '购买理由' },
] as const;

export type DetailImagePlanCard = {
  themeId: DetailImageThemeId;
  title: string;
  requirement: string;
};

/** 按固定主题标题解析详情图 themeId；无法识别则返回 null */
export function detailThemeIdByTitle(title: string): DetailImageThemeId | null {
  const normalized = title.trim();
  const found = DETAIL_IMAGE_THEMES.find((theme) => theme.title === normalized);
  return found?.id ?? null;
}
