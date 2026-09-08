import { DETAIL_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import { formatDetailImageRequirement } from '@/app/api/studio/ecommerce/_shared/detail-image-requirement';
import { parsePlanByThemes, type ParsedThemePlan } from './parse-theme-plan';

export type ParsedDetailImagePlan = ParsedThemePlan;

/**
 * 从详情图结构规划 Markdown 解析六屏主题卡片，并把正文收成统一格式。
 */
export function parseDetailImagePlan(markdown: string): ParsedDetailImagePlan {
  const parsed = parsePlanByThemes(markdown, DETAIL_IMAGE_THEMES);
  return {
    cards: parsed.cards.map((card) => ({
      ...card,
      requirement: formatDetailImageRequirement(card.requirement),
    })),
  };
}
