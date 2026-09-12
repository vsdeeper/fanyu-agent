import { describe, expect, it } from 'vitest';
import { MAIN_IMAGE_THEME_IDS, MAIN_IMAGE_THEMES, themeIdByTitle } from './main-image-plan';

describe('主图主题表', () => {
  it('主题表覆盖全部主题 id 且标题唯一', () => {
    expect(MAIN_IMAGE_THEMES.map((theme) => theme.id)).toEqual([...MAIN_IMAGE_THEME_IDS]);
    expect(new Set(MAIN_IMAGE_THEMES.map((theme) => theme.title)).size).toBe(
      MAIN_IMAGE_THEMES.length,
    );
  });

  it('标题是解析的唯一锚点：每个标题都能解析回自己的 themeId', () => {
    for (const theme of MAIN_IMAGE_THEMES) {
      expect(themeIdByTitle(theme.title)).toBe(theme.id);
    }
  });

  it('无法识别的标题返回 null', () => {
    expect(themeIdByTitle('套图视觉规范')).toBeNull();
  });
});
