import { describe, expect, it } from 'vitest';
import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import {
  getSelectedImageUrls,
  groupResultImagesByTheme,
  keepExistingImageIds,
  normalizeResultImages,
  pickExistingImageId,
  type StudioResultImage,
} from './result-images';

describe('getSelectedImageUrls', () => {
  it('按点选顺序返回就绪 URL 并跳过失败项', () => {
    const images: StudioResultImage[] = [
      { id: 'a', aspectRatio: '1:1', status: 'failed' },
      { id: 'b', aspectRatio: '1:1', status: 'ready', url: '/a.png' },
      { id: 'c', aspectRatio: '1:1', status: 'ready', url: '/b.png' },
    ];
    expect(getSelectedImageUrls(images, ['c', 'a', 'b'])).toEqual(['/b.png', '/a.png']);
  });
});

describe('groupResultImagesByTheme', () => {
  it('按给定主题顺序分组并保留组内原顺序', () => {
    const images: StudioResultImage[] = [
      { id: 'a', aspectRatio: '1:1', status: 'ready', themeId: 'scene', themeTitle: '使用场景' },
      { id: 'b', aspectRatio: '1:1', status: 'ready', themeId: 'product', themeTitle: '产品展示' },
    ];
    expect(
      groupResultImagesByTheme(images, MAIN_IMAGE_THEMES).map((group) => group.themeId),
    ).toEqual(['product', 'scene']);
  });
});

describe('normalizeResultImages', () => {
  it('保留带 id 的图片并透传主题字段', () => {
    expect(
      normalizeResultImages([
        { id: 'a', aspectRatio: '1:1', status: 'ready', url: '/a.png', themeId: 'scene' },
      ]),
    ).toEqual([{ id: 'a', aspectRatio: '1:1', status: 'ready', url: '/a.png', themeId: 'scene' }]);
  });

  it('旧数据缺 id 时按 index 字段派生确定性身份，且不受数组位置影响', () => {
    // 取消生成会让数组收缩留洞（0 与 2 之间缺 1），派生值必须取 index 字段而非遍历位置
    expect(normalizeResultImages([{ index: 0 }, { index: 2 }]).map((image) => image.id)).toEqual([
      'legacy-0',
      'legacy-2',
    ]);
  });

  it('非法项被丢弃，缺失字段兜底', () => {
    expect(normalizeResultImages([null, 'x', { status: 'weird' }, { index: 1 }])).toEqual([
      { id: 'legacy-1', aspectRatio: '', status: 'pending' },
    ]);
    expect(normalizeResultImages(undefined)).toEqual([]);
  });
});

describe('选中 id 校验', () => {
  const images: StudioResultImage[] = [{ id: 'a', aspectRatio: '1:1', status: 'ready' }];

  it('pickExistingImageId 只认结果集里存在的字符串 id', () => {
    expect(pickExistingImageId(images, 'a')).toBe('a');
    expect(pickExistingImageId(images, 'b')).toBeNull();
    expect(pickExistingImageId(images, 0)).toBeNull();
    expect(pickExistingImageId(images, null)).toBeNull();
  });

  it('keepExistingImageIds 过滤掉已消失的选中项', () => {
    expect(keepExistingImageIds(images, ['b', 'a'])).toEqual(['a']);
  });
});
