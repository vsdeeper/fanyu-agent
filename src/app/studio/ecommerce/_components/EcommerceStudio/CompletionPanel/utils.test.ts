import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import type { DesignResultGroups, StudioResultImage } from '../types';
import {
  createResultArchive,
  createSelectedImageArchive,
  getGeneratedDesignGroups,
  getGeneratedImages,
  orderSelectedImagesByTheme,
  toExportArchiveName,
  toggleExportIndexByTheme,
} from './utils';

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

  it('仅一类图片时落在 ZIP 根目录，不套类型文件夹', async () => {
    const archive = await createResultArchive([], { 主图: [READY_IMAGE] }, '# 分析');
    const names = Object.keys(unzipSync(new Uint8Array(archive)));

    expect(names).toContain('1:1-01.png');
    expect(names).toContain('商业分析.md');
    expect(names.some((name) => name.startsWith('主图/'))).toBe(false);
  });

  it('主图按主题名称、比例与组内编号命名', async () => {
    const archive = await createResultArchive(
      [],
      {
        主图: [
          {
            ...READY_IMAGE,
            index: 0,
            aspectRatio: '1:1',
            themeId: 'product',
            themeTitle: '产品展示',
          },
          {
            ...READY_IMAGE,
            index: 1,
            aspectRatio: '1:1',
            themeId: 'product',
            themeTitle: '产品展示',
          },
          {
            ...READY_IMAGE,
            index: 2,
            aspectRatio: '3:4',
            themeId: 'scene',
            themeTitle: '使用场景',
          },
        ],
      },
      '',
    );
    const names = Object.keys(unzipSync(new Uint8Array(archive)));

    expect(names).toEqual(
      expect.arrayContaining(['产品展示-1:1-01.png', '产品展示-1:1-02.png', '使用场景-3:4-01.png']),
    );
    expect(names.some((name) => name === '1:1-01.png' || name.startsWith('主图/'))).toBe(false);
  });

  it('每主题最多点选一张，再点同主题则替换', () => {
    const images: StudioResultImage[] = [
      {
        ...READY_IMAGE,
        index: 0,
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
      {
        ...READY_IMAGE,
        index: 1,
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
      {
        ...READY_IMAGE,
        index: 2,
        themeId: 'scene',
        themeTitle: '使用场景',
      },
    ];

    const first = toggleExportIndexByTheme([], 0, images);
    expect(first).toEqual([0]);
    expect(toggleExportIndexByTheme(first, 1, images)).toEqual([1]);
    expect(toggleExportIndexByTheme([1], 2, images)).toEqual([1, 2]);
    expect(toggleExportIndexByTheme([1, 2], 1, images)).toEqual([2]);
  });

  it('点选导出只含所选图，按主题-比例-编号命名且不附商业分析', async () => {
    const images: StudioResultImage[] = [
      {
        ...READY_IMAGE,
        index: 0,
        aspectRatio: '3:4',
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
      {
        ...READY_IMAGE,
        index: 1,
        aspectRatio: '3:4',
        themeId: 'scene',
        themeTitle: '使用场景',
      },
    ];
    const selected = orderSelectedImagesByTheme(
      images,
      [1],
      [
        { id: 'brand', title: '品牌认知' },
        { id: 'scene', title: '使用场景' },
      ],
    );
    expect(selected).toHaveLength(1);
    expect(selected[0]?.themeId).toBe('scene');

    const names = Object.keys(unzipSync(await createSelectedImageArchive(selected)));
    expect(names).toEqual(['使用场景-3:4-01.png']);
    expect(names).not.toContain('商业分析.md');
  });

  it('导出 ZIP 按任务类型命名', () => {
    expect(toExportArchiveName('主图')).toBe('主图设计成果.zip');
    expect(toExportArchiveName('详情图')).toBe('详情图设计成果.zip');
    expect(toExportArchiveName('营销海报')).toBe('营销海报设计成果.zip');
  });
});
