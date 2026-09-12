import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { DETAIL_IMAGE_THEME_IDS } from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import { MAIN_IMAGE_ANALYZE_THEME_IDS } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import {
  DETAIL_IMAGE_ANALYZE_INSTRUCTIONS,
  MAIN_IMAGE_ANALYZE_INSTRUCTIONS,
} from './analyze-instructions';
import {
  buildRewriteCardInstructions,
  DETAIL_IMAGE_THEME_DUTIES,
  MAIN_IMAGE_SPEC_THEME_DUTY,
  MAIN_IMAGE_THEME_DUTIES,
} from './rewrite-card-instructions';

/**
 * 主题职责在两个文件里各存了一份（分析指令的 `## 小节` 与帮写的 `*_THEME_DUTIES`），
 * 靠人工保持一致。这组用例是唯一的防漂移机制：改了一处忘了另一处会直接红。
 *
 * 迭代源是「分析产出的主题」而非全部主图主题：用户自填的「规格主图」不由分析产出，
 * 它的职责（MAIN_IMAGE_SPEC_THEME_DUTY）只有单副本，无需比对。
 */
describe('主题职责两份副本保持同步', () => {
  it.each(MAIN_IMAGE_ANALYZE_THEME_IDS)('主图「%s」职责逐字出现在分析指令中', (themeId) => {
    expect(MAIN_IMAGE_ANALYZE_INSTRUCTIONS).toContain(MAIN_IMAGE_THEME_DUTIES[themeId]);
  });

  it.each(DETAIL_IMAGE_THEME_IDS)('详情图「%s」职责逐字出现在分析指令中', (themeId) => {
    expect(DETAIL_IMAGE_ANALYZE_INSTRUCTIONS).toContain(DETAIL_IMAGE_THEME_DUTIES[themeId]);
  });

  it.each(MAIN_IMAGE_ANALYZE_THEME_IDS)('帮写指令带上主图「%s」职责', (themeId) => {
    expect(buildRewriteCardInstructions('mainImage', themeId)).toContain(
      MAIN_IMAGE_THEME_DUTIES[themeId],
    );
  });

  it.each(DETAIL_IMAGE_THEME_IDS)('帮写指令带上详情图「%s」职责', (themeId) => {
    expect(buildRewriteCardInstructions('detailImage', themeId)).toContain(
      DETAIL_IMAGE_THEME_DUTIES[themeId],
    );
  });
});

describe('「规格主图」独立于其余五张', () => {
  it('帮写指令带上规格主图职责，且不要求与其它张互斥', () => {
    const instructions = buildRewriteCardInstructions('mainImage', 'spec');

    expect(instructions).toContain(MAIN_IMAGE_SPEC_THEME_DUTY);
    expect(instructions).toContain('当前张标题：规格主图');
    expect(instructions).toContain('本张独立于其余五张主题卡');
    expect(instructions).not.toContain('禁止与其它张重复同一卖点');
    expect(instructions).not.toContain('恰好五个二级标题');
  });

  it('规格主图职责不写进主图分析指令', () => {
    expect(MAIN_IMAGE_ANALYZE_INSTRUCTIONS).not.toContain(MAIN_IMAGE_SPEC_THEME_DUTY);
    expect(MAIN_IMAGE_ANALYZE_INSTRUCTIONS).not.toContain('规格主图');
  });
});

describe('品牌认知的 Logo 规则', () => {
  it('要求把品牌 Logo 作为独立设计元素呈现，而非只出现在产品机身上', () => {
    expect(DETAIL_IMAGE_THEME_DUTIES.brand).toContain('当设计元素独立呈现于画面');
    expect(DETAIL_IMAGE_THEME_DUTIES.brand).toContain('不能只让它出现在产品机身上');
  });

  it('无品牌信息时可省略，不去编造品牌', () => {
    expect(DETAIL_IMAGE_THEME_DUTIES.brand).toContain('商业分析确无品牌信息时才可省略');
  });

  it('允许写 Logo 呈现方式但仍禁止写具体位置', () => {
    expect(DETAIL_IMAGE_ANALYZE_INSTRUCTIONS).toContain('不写具体位置');
  });
});
