import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
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
    const archive = await createResultArchive([READY_IMAGE], { 主图: [READY_IMAGE] }, '');

    expect(archive.byteLength).toBeGreaterThan(0);
  });

  it('按设计类型与比例命名图片，并附带商业分析文件', async () => {
    const archive = await createResultArchive(
      [{ ...READY_IMAGE, aspectRatio: '1:1' }],
      { 营销海报: [{ ...READY_IMAGE, aspectRatio: '3:4' }] },
      '# 商业分析正文',
    );
    const files = unzipSync(new Uint8Array(archive));
    const names = Object.keys(files);

    expect(names).toContain('商业分析.md');
    expect(names).toContain('营销主视觉/1:1-01.png');
    expect(names).toContain('营销海报/3:4-01.png');
  });
});
