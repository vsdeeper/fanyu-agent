import { describe, expect, it } from 'vitest';
import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import { groupResultImagesByTheme, type StudioResultImage } from './result-images';

describe('groupResultImagesByTheme', () => {
  it('按给定主题顺序分组并保留组内原顺序', () => {
    const images: StudioResultImage[] = [
      { index: 0, aspectRatio: '1:1', status: 'ready', themeId: 'scene', themeTitle: '使用场景' },
      { index: 1, aspectRatio: '1:1', status: 'ready', themeId: 'product', themeTitle: '产品展示' },
    ];
    expect(
      groupResultImagesByTheme(images, MAIN_IMAGE_THEMES).map((group) => group.themeId),
    ).toEqual(['product', 'scene']);
  });
});
