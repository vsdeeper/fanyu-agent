import {
  MAIN_IMAGE_THEMES,
  MAIN_IMAGE_VISUAL_LOCK_TITLE,
  themeIdByTitle,
  type MainImagePlanCard,
} from '@/app/api/studio/ecommerce/_shared/main-image-plan';

export type ParsedMainImagePlan = {
  visualLock: string;
  cards: MainImagePlanCard[];
};

type MarkdownSection = {
  title: string;
  body: string;
};

/**
 * 按二级标题切开 Markdown；标题需原文匹配「套图视觉规范」与五个主题名。
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
 * 从主图分析 Markdown 解析套图视觉规范与主题卡片；流式半成品也尽量切出已完整的节。
 */
export function parseMainImagePlan(markdown: string): ParsedMainImagePlan {
  const sections = splitMarkdownSections(markdown);
  let visualLock = '';
  const byId = new Map<string, MainImagePlanCard>();

  for (const section of sections) {
    if (section.title === MAIN_IMAGE_VISUAL_LOCK_TITLE) {
      visualLock = section.body;
      continue;
    }
    const themeId = themeIdByTitle(section.title);
    if (!themeId || !section.body) continue;
    byId.set(themeId, { themeId, title: section.title, requirement: section.body });
  }

  const cards = MAIN_IMAGE_THEMES.flatMap((theme) => {
    const card = byId.get(theme.id);
    return card ? [card] : [];
  });

  return { visualLock, cards };
}
