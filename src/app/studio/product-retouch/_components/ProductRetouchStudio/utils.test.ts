import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ResultImage } from './types';
import {
  appendProductImages,
  applyGenerateEvent,
  dropPendingImages,
  getSelectedImageUrl,
  getSelectedImageUrls,
  hasReadyImage,
  isSameStepSnapshot,
  pendingImages,
  phaseAfterNext,
  phaseAfterPrev,
  readRefineStepSnapshot,
  readSelectedIndexes,
  toMultiviewPayload,
  toRefinePayload,
  toggleSelectedIndex,
} from './utils';
import { DEFAULT_MULTIVIEW_FORM, DEFAULT_REFINE_FORM } from './constants';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('上传项 uid', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('新项使用 UUID 且不含文件名', () => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => undefined,
    });
    const file = new File(['img'], '美的台扇.png', { type: 'image/png' });
    const images = appendProductImages([], [file]);

    expect(images[0]?.uid).toMatch(UUID_RE);
    expect(images[0]?.uid).not.toContain(file.name);
  });
});

describe('产品精修结果流', () => {
  it('追加批次时使用连续索引并按偏移更新', () => {
    const current = [
      { index: 0, aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,OLD' },
      ...pendingImages(2, 1, '16:9'),
    ] satisfies ResultImage[];

    const next = applyGenerateEvent(current, { index: 1, url: 'data:image/png;base64,NEW' }, 1);

    expect(next[0]).toBe(current[0]);
    expect(next[2]).toMatchObject({
      index: 2,
      status: 'ready',
      url: 'data:image/png;base64,NEW',
    });
  });

  it('只有点选且就绪的图片可作为精修标准', () => {
    const images: ResultImage[] = [
      { index: 0, aspectRatio: '1:1', status: 'failed' },
      { index: 1, aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,READY' },
      { index: 2, aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,SIDE' },
    ];

    expect(getSelectedImageUrl(images, 0)).toBeNull();
    expect(getSelectedImageUrl(images, 1)).toBe('data:image/png;base64,READY');
    expect(getSelectedImageUrls(images, [2, 1, 0])).toEqual([
      'data:image/png;base64,SIDE',
      'data:image/png;base64,READY',
    ]);
    expect(hasReadyImage(images)).toBe(true);
  });

  it('丢掉本批 pending 占位并保留已完成结果', () => {
    const images: ResultImage[] = [
      { index: 0, aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,OLD' },
      { index: 1, aspectRatio: '1:1', status: 'pending' },
      { index: 2, aspectRatio: '1:1', status: 'failed', error: '失败' },
    ];
    expect(dropPendingImages(images)).toEqual([images[0], images[2]]);
  });
});

describe('产品精修步骤与请求', () => {
  it('按多视角选项进入第二步或直接完成', () => {
    expect(phaseAfterNext('refine', true)).toBe('multiview');
    expect(phaseAfterNext('refine', false)).toBe('complete');
    expect(phaseAfterNext('refineGenerating', false)).toBe('refineGenerating');
    expect(phaseAfterPrev('multiview', true)).toBe('refine');
    expect(phaseAfterPrev('multiviewGenerating', true)).toBe('refine');
    expect(phaseAfterPrev('complete', true)).toBe('multiview');
    expect(phaseAfterPrev('complete', false)).toBe('refine');
  });

  it('精修标准下标可切换且达上限拒绝追加', () => {
    expect(toggleSelectedIndex([0], 1, 6)).toEqual({ indexes: [0, 1], atLimit: false });
    expect(toggleSelectedIndex([0, 1], 0, 6)).toEqual({ indexes: [1], atLimit: false });
    expect(toggleSelectedIndex([0, 1], 2, 2)).toEqual({ indexes: [0, 1], atLimit: true });
  });

  it('读取精修快照时把旧 selectedIndex 迁成数组', () => {
    expect(readSelectedIndexes({ selectedIndex: 2 })).toEqual([2]);
    expect(readSelectedIndexes({ selectedIndexes: [1, 3] })).toEqual([1, 3]);
    expect(
      readRefineStepSnapshot({
        form: DEFAULT_REFINE_FORM,
        images: [],
        results: [],
        selectedIndex: 0,
        needsMultiview: true,
      })?.selectedIndexes,
    ).toEqual([0]);
  });

  it('精修请求固定生成数量为 1，按上传原图组装参考图', async () => {
    await expect(
      toRefinePayload({ ...DEFAULT_REFINE_FORM, count: '3', requirement: ' 优化光影 ' }, [
        { uid: 'u1', previewUrl: 'data:image/png;base64,AA==' },
      ]),
    ).resolves.toMatchObject({
      kind: 'productRefine',
      count: 1,
      refineRequirement: '优化光影',
      images: [{ dataUrl: 'data:image/png;base64,AA==' }],
    });
  });

  it('多视角请求固定生成数量为 1，携带全部精修标准图', () => {
    expect(
      toMultiviewPayload(
        { ...DEFAULT_MULTIVIEW_FORM, count: '3', requirement: ' 生成六个统一视角 ' },
        ['data:image/png;base64,REFINED', 'data:image/png;base64,SIDE'],
      ),
    ).toMatchObject({
      kind: 'productMultiview',
      count: 1,
      multiviewRequirement: '生成六个统一视角',
      refinedImageDataUrls: ['data:image/png;base64,REFINED', 'data:image/png;base64,SIDE'],
    });
  });
});

describe('isSameStepSnapshot', () => {
  it('无基线视为已变化', () => {
    expect(isSameStepSnapshot({ form: DEFAULT_MULTIVIEW_FORM, results: [] }, undefined)).toBe(
      false,
    );
  });

  it('选中下标变化则不相等', () => {
    const baseline = {
      form: DEFAULT_MULTIVIEW_FORM,
      images: [],
      results: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/img/1' }],
      selectedIndexes: [0],
      needsMultiview: true,
    };
    expect(isSameStepSnapshot({ ...baseline, selectedIndexes: [1] }, baseline)).toBe(false);
    expect(isSameStepSnapshot(baseline, baseline)).toBe(true);
  });

  it('结果 URL 变化则不相等', () => {
    const baseline = {
      form: DEFAULT_MULTIVIEW_FORM,
      results: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/img/old' }],
    };
    expect(
      isSameStepSnapshot(
        {
          ...baseline,
          results: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/img/new' }],
        },
        baseline,
      ),
    ).toBe(false);
  });
});
