import { DETAIL_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import { parsePlanByThemes, type ParsedThemePlan } from './parse-theme-plan';

export type ParsedDetailImagePlan = ParsedThemePlan;

/**
 * 从详情图结构规划 Markdown 解析六屏主题卡片。
 */
export function parseDetailImagePlan(markdown: string): ParsedDetailImagePlan {
  return parsePlanByThemes(markdown, DETAIL_IMAGE_THEMES);
}
