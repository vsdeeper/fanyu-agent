import type { ThemeDefinition, ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import { themeIdByTitle } from '@/app/api/studio/ecommerce/_shared/theme-plan';

export type ParsedThemePlan = {
  cards: ThemePlanCard[];
};

type MarkdownSection = {
  title: string;
  body: string;
};

/**
 * 按二级标题切开 Markdown。
 */
function splitMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const headingRe = /^##\s+(.+)$/gm;
  let match = headingRe.exec(markdown);
  while (match) {
    const title = match[1]?.trim() ?? '';
    const start = match.index + match[0].length;
    const next = headingRe.exec(markdown);
    const end = next ? next.index : markdown.length;
    sections.push({ title, body: markdown.slice(start, end).trim() });
    match = next;
  }
  return sections;
}

/**
 * 从规划 Markdown 解析主题卡片；流式半成品也尽量切出已完整的节。
 */
export function parsePlanByThemes(
  markdown: string,
  themes: readonly ThemeDefinition[],
): ParsedThemePlan {
  const sections = splitMarkdownSections(markdown);
  const byId = new Map<string, ThemePlanCard>();

  for (const section of sections) {
    const themeId = themeIdByTitle(section.title, themes);
    if (!themeId || !section.body) continue;
    byId.set(themeId, { themeId, title: section.title, requirement: section.body });
  }

  const cards = themes.flatMap((theme) => {
    const card = byId.get(theme.id);
    return card ? [card] : [];
  });

  return { cards };
}
