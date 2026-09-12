import {
  MAIN_IMAGE_SPEC_THEME,
  MAIN_IMAGE_SPEC_THEME_ID,
} from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';

/**
 * 补上用户自填的「规格主图」卡（末位）：主图分析不产出它，要求由用户输入或 AI 帮写。
 *
 * 已有同 id 卡时原样返回，不覆盖用户已填内容；传入空列表时不追加 ——
 * 分析没切出任何卡时右栏本就无卡可展示，凭空加一张空卡只会让人以为分析成功了。
 */
export function withMainImageSpecCard(cards: readonly ThemePlanCard[]): ThemePlanCard[] {
  if (cards.length === 0) return [];
  if (cards.some((card) => card.themeId === MAIN_IMAGE_SPEC_THEME_ID)) return [...cards];
  return [
    ...cards,
    {
      themeId: MAIN_IMAGE_SPEC_THEME.id,
      title: MAIN_IMAGE_SPEC_THEME.title,
      requirement: '',
    },
  ];
}
