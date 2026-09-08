export type ThemePlanCard = {
  themeId: string;
  title: string;
  requirement: string;
};

export type ThemeDefinition = {
  id: string;
  title: string;
};

/** 按固定主题标题解析 themeId；无法识别则返回 null */
export function themeIdByTitle<T extends string>(
  title: string,
  themes: readonly { id: T; title: string }[],
): T | null {
  const normalized = title.trim();
  const found = themes.find((theme) => theme.title === normalized);
  return found?.id ?? null;
}
