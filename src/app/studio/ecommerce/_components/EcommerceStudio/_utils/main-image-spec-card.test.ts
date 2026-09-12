import { describe, expect, it } from 'vitest';
import { MAIN_IMAGE_SPEC_THEME } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import { withMainImageSpecCard } from './main-image-spec-card';

const PARSED_CARDS: ThemePlanCard[] = [
  { themeId: 'product', title: '产品展示', requirement: '设计目标：一眼印象' },
  { themeId: 'value', title: '用户价值', requirement: '设计目标：写利益' },
];

describe('withMainImageSpecCard', () => {
  it('在末位补一张空的规格主图卡', () => {
    const next = withMainImageSpecCard(PARSED_CARDS);

    expect(next.map((card) => card.themeId)).toEqual(['product', 'value', 'spec']);
    expect(next.at(-1)).toEqual({
      themeId: MAIN_IMAGE_SPEC_THEME.id,
      title: MAIN_IMAGE_SPEC_THEME.title,
      requirement: '',
    });
    expect(PARSED_CARDS).toHaveLength(2);
  });

  it('已有规格主图卡时保留用户所填内容，不重复追加', () => {
    const filled: ThemePlanCard[] = [
      ...PARSED_CARDS,
      { themeId: 'spec', title: '规格主图', requirement: '设计目标：白色款' },
    ];

    const next = withMainImageSpecCard(filled);

    expect(next).toHaveLength(3);
    expect(next.at(-1)?.requirement).toBe('设计目标：白色款');
  });

  it('空列表不追加，避免分析没切出卡时凭空多一张空卡', () => {
    expect(withMainImageSpecCard([])).toEqual([]);
  });
});
