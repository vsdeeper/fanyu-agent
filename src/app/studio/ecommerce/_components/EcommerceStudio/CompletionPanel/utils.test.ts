import { describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { MAIN_IMAGE_THEMES } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type { DesignResultGroups, StudioResultImage } from '../types';
import {
  createResultArchive,
  createSelectedImageArchive,
  getGeneratedDesignGroups,
  getGeneratedImages,
  getSelectableExportIds,
  isAllExportSelected,
  orderSelectedImagesByTheme,
  toExportArchiveName,
  toggleAllExportSelectedIds,
  toggleExportSelectedId,
  toggleExportSelectedIdByTheme,
} from './utils';

const READY_IMAGE: StudioResultImage = {
  id: 'img-0',
  aspectRatio: '1:1',
  status: 'ready',
  url: 'data:image/png;base64,aGVsbG8=',
};

describe('电商成果整理', () => {
  it('只保留生成成功且有地址的图片', () => {
    expect(
      getGeneratedImages([
        READY_IMAGE,
        { id: 'p1', aspectRatio: '1:1', status: 'pending' },
        { id: 'p2', aspectRatio: '1:1', status: 'failed', error: '失败' },
      ]),
    ).toEqual([READY_IMAGE]);
  });

  it('按设计类型过滤空分组', () => {
    const groups: DesignResultGroups = {
      主图: [READY_IMAGE],
      营销海报: [{ id: 'p3', aspectRatio: '3:4', status: 'failed' }],
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
            id: 'img-0',
            aspectRatio: '1:1',
            themeId: 'product',
            themeTitle: '产品展示',
          },
          {
            ...READY_IMAGE,
            id: 'img-1',
            aspectRatio: '1:1',
            themeId: 'product',
            themeTitle: '产品展示',
          },
          {
            ...READY_IMAGE,
            id: 'img-2',
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
        id: 'img-0',
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
      {
        ...READY_IMAGE,
        id: 'img-1',
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
      {
        ...READY_IMAGE,
        id: 'img-2',
        themeId: 'scene',
        themeTitle: '使用场景',
      },
    ];

    const first = toggleExportSelectedIdByTheme([], 'img-0', images);
    expect(first).toEqual(['img-0']);
    expect(toggleExportSelectedIdByTheme(first, 'img-1', images)).toEqual(['img-1']);
    expect(toggleExportSelectedIdByTheme(['img-1'], 'img-2', images)).toEqual(['img-1', 'img-2']);
    expect(toggleExportSelectedIdByTheme(['img-1', 'img-2'], 'img-1', images)).toEqual(['img-2']);
  });

  it('点选导出只含所选图，按主题-比例-编号命名且不附商业分析', async () => {
    const images: StudioResultImage[] = [
      {
        ...READY_IMAGE,
        id: 'img-0',
        aspectRatio: '3:4',
        themeId: 'brand',
        themeTitle: '品牌认知',
      },
      {
        ...READY_IMAGE,
        id: 'img-1',
        aspectRatio: '3:4',
        themeId: 'scene',
        themeTitle: '使用场景',
      },
    ];
    const selected = orderSelectedImagesByTheme(
      images,
      ['img-1'],
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

/** 主图同主题多张的夹具：product 两张、scene 一张。 */
const MAIN_IMAGE_SELECTION_FIXTURES: StudioResultImage[] = [
  { ...READY_IMAGE, id: 'img-0', themeId: 'product', themeTitle: '产品展示' },
  { ...READY_IMAGE, id: 'img-1', themeId: 'product', themeTitle: '产品展示' },
  { ...READY_IMAGE, id: 'img-2', themeId: 'scene', themeTitle: '使用场景' },
];

describe('主图导出勾选', () => {
  it('同主题多张可同时选中，再点已选即取消', () => {
    const images = MAIN_IMAGE_SELECTION_FIXTURES;

    const first = toggleExportSelectedId([], 'img-0', images);
    expect(first).toEqual(['img-0']);
    // 与详情图的「每主题至多一张」形成对照：同主题第二张是追加而非替换
    expect(toggleExportSelectedId(first, 'img-1', images)).toEqual(['img-0', 'img-1']);
    expect(toggleExportSelectedId(['img-0', 'img-1'], 'img-0', images)).toEqual(['img-1']);
    expect(toggleExportSelectedId(['img-1'], 'img-2', images)).toEqual(['img-1', 'img-2']);
  });

  it('两个 toggle 语义不可互换', () => {
    const images = MAIN_IMAGE_SELECTION_FIXTURES;

    expect(toggleExportSelectedIdByTheme(['img-0'], 'img-1', images)).toEqual(['img-1']);
    expect(toggleExportSelectedId(['img-0'], 'img-1', images)).toEqual(['img-0', 'img-1']);
  });

  it('未就绪、无地址或不存在的图不改变选集', () => {
    const images: StudioResultImage[] = [
      ...MAIN_IMAGE_SELECTION_FIXTURES,
      { id: 'pending', aspectRatio: '1:1', status: 'pending' },
      { id: 'failed', aspectRatio: '1:1', status: 'failed', error: '失败' },
      { id: 'ready-no-url', aspectRatio: '1:1', status: 'ready' },
    ];

    for (const id of ['pending', 'failed', 'ready-no-url', 'ghost']) {
      expect(toggleExportSelectedId([], id, images)).toEqual([]);
      expect(toggleExportSelectedId(['img-0'], id, images)).toEqual(['img-0']);
    }
  });

  it('全选集合按主题顺序展开，只收已生成完成的图', () => {
    const images: StudioResultImage[] = [
      { ...READY_IMAGE, id: 's-1', themeId: 'scene', themeTitle: '使用场景' },
      { ...READY_IMAGE, id: 'p-1', themeId: 'product', themeTitle: '产品展示' },
      { ...READY_IMAGE, id: 'p-2', themeId: 'product', themeTitle: '产品展示' },
      {
        id: 'pend',
        aspectRatio: '1:1',
        status: 'pending',
        themeId: 'product',
        themeTitle: '产品展示',
      },
      {
        id: 'no-theme',
        aspectRatio: '1:1',
        status: 'ready',
        url: 'data:image/png;base64,aGVsbG8=',
      },
    ];

    expect(getSelectableExportIds(images, MAIN_IMAGE_THEMES)).toEqual(['p-1', 'p-2', 's-1']);
  });

  it('空可选集合不判为全选', () => {
    expect(isAllExportSelected([], [])).toBe(false);
    expect(isAllExportSelected([], ['img-0'])).toBe(false);
    expect(isAllExportSelected(['img-0'], ['img-0'])).toBe(true);
    expect(isAllExportSelected(['img-0', 'img-1'], ['img-0'])).toBe(true);
  });

  it('全选与取消全选互切，并清掉失效的旧勾选', () => {
    expect(toggleAllExportSelectedIds([], ['img-0', 'img-1'])).toEqual(['img-0', 'img-1']);
    expect(toggleAllExportSelectedIds(['img-0', 'img-1'], ['img-0', 'img-1'])).toEqual([]);
    expect(toggleAllExportSelectedIds(['ghost'], ['img-0', 'img-1'])).toEqual(['img-0', 'img-1']);
  });

  it('点选导出只含所选图，平铺在 ZIP 根目录且不附任何分析文档', async () => {
    const selected = orderSelectedImagesByTheme(
      MAIN_IMAGE_SELECTION_FIXTURES,
      ['img-0', 'img-1', 'img-2'],
      MAIN_IMAGE_THEMES,
    );

    const names = Object.keys(
      unzipSync(new Uint8Array(await createSelectedImageArchive(selected))),
    );

    expect(names).toEqual(
      expect.arrayContaining(['产品展示-1:1-01.png', '产品展示-1:1-02.png', '使用场景-1:1-01.png']),
    );
    expect(names).not.toContain('商业分析.md');
    expect(names.some((name) => name.startsWith('主图/') || name.endsWith('.md'))).toBe(false);
  });
});
