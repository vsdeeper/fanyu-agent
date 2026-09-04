import { describe, expect, it } from 'vitest';
import type { DesignResultGroups, StudioResultImage } from '../types';
import { createResultArchive, getGeneratedDesignGroups, getGeneratedImages } from './utils';

const READY_IMAGE: StudioResultImage = {
  index: 0,
  aspectRatio: '1:1',
  status: 'ready',
  url: 'data:image/png;base64,aGVsbG8=',
};

describe('电商成果整理', () => {
  it('只保留生成成功且有地址的图片', () => {
    expect(
      getGeneratedImages([
        READY_IMAGE,
        { index: 1, aspectRatio: '1:1', status: 'pending' },
        { index: 2, aspectRatio: '1:1', status: 'failed', error: '失败' },
      ]),
    ).toEqual([READY_IMAGE]);
  });

  it('按设计类型过滤空分组', () => {
    const groups: DesignResultGroups = {
      主图: [READY_IMAGE],
      营销海报: [{ index: 0, aspectRatio: '3:4', status: 'failed' }],
    };

    expect(getGeneratedDesignGroups(groups)).toEqual({ 主图: [READY_IMAGE] });
  });

  it('可打包主视觉与视觉设计成果', async () => {
    const archive = await createResultArchive([READY_IMAGE], { 主图: [READY_IMAGE] });

    expect(archive.byteLength).toBeGreaterThan(0);
  });
});
