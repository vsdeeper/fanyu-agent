import { describe, expect, it } from 'vitest';
import {
  MAIN_IMAGE_ANALYZE_THEME_IDS,
  MAIN_IMAGE_SPEC_THEME,
  MAIN_IMAGE_SPEC_THEME_ID,
  MAIN_IMAGE_THEME_IDS,
  MAIN_IMAGE_THEMES,
  themeIdByTitle,
} from './main-image-plan';

describe('主图主题表', () => {
  it('规格主图排在末位，且标题可被解析回 spec', () => {
    expect(MAIN_IMAGE_THEMES.at(-1)).toEqual(MAIN_IMAGE_SPEC_THEME);
    // 标题是解析的唯一锚点：改了标题而没同步解析表，卡片会被静默丢弃
    expect(themeIdByTitle(MAIN_IMAGE_SPEC_THEME.title)).toBe(MAIN_IMAGE_SPEC_THEME_ID);
  });

  it('分析产出的主题不含规格主图，全部主题含它', () => {
    expect(MAIN_IMAGE_ANALYZE_THEME_IDS).not.toContain(MAIN_IMAGE_SPEC_THEME_ID);
    expect(MAIN_IMAGE_THEME_IDS).toContain(MAIN_IMAGE_SPEC_THEME_ID);
    expect(MAIN_IMAGE_THEME_IDS).toHaveLength(MAIN_IMAGE_ANALYZE_THEME_IDS.length + 1);
  });

  it('主题表覆盖全部主题 id 且标题唯一', () => {
    expect(MAIN_IMAGE_THEMES.map((theme) => theme.id)).toEqual([...MAIN_IMAGE_THEME_IDS]);
    expect(new Set(MAIN_IMAGE_THEMES.map((theme) => theme.title)).size).toBe(
      MAIN_IMAGE_THEMES.length,
    );
  });
});
