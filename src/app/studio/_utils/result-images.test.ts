import { describe, expect, it } from 'vitest';
import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import {
  getSelectedImageUrls,
  groupResultImagesByTheme,
  type StudioResultImage,
} from './result-images';

describe('getSelectedImageUrls', () => {
  it('按点选顺序返回就绪 URL 并跳过失败项', () => {
    const images: StudioResultImage[] = [
      { index: 0, aspectRatio: '1:1', status: 'failed' },
      { index: 1, aspectRatio: '1:1', status: 'ready', url: '/a.png' },
      { index: 2, aspectRatio: '1:1', status: 'ready', url: '/b.png' },
    ];
    expect(getSelectedImageUrls(images, [2, 0, 1])).toEqual(['/b.png', '/a.png']);
  });
});

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
