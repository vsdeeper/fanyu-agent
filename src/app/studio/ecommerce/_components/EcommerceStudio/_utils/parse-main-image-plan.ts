import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import { parsePlanByThemes, type ParsedThemePlan } from './parse-theme-plan';

export type ParsedMainImagePlan = ParsedThemePlan;

/**
 * 从主图分析 Markdown 解析主题卡片。
 */
export function parseMainImagePlan(markdown: string): ParsedMainImagePlan {
  return parsePlanByThemes(markdown, MAIN_IMAGE_THEMES);
}
