import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import { formatMainImageRequirement } from '@/app/api/studio/ecommerce/_shared/main-image-requirement';
import { parsePlanByThemes, type ParsedThemePlan } from './parse-theme-plan';

export type ParsedMainImagePlan = ParsedThemePlan;

/**
 * 从主图分析 Markdown 解析五张主题卡片，并把正文收成统一格式（与详情图同构）。
 */
export function parseMainImagePlan(markdown: string): ParsedMainImagePlan {
  const parsed = parsePlanByThemes(markdown, MAIN_IMAGE_THEMES);
  return {
    cards: parsed.cards.map((card) => ({
      ...card,
      requirement: formatMainImageRequirement(card.requirement),
    })),
  };
}
