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
  readSelectedIds,
  toMultiviewPayload,
  toRefinePayload,
  toggleSelectedId,
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
  it('追加批次时各槽位 id 唯一，事件按 id 更新', () => {
    const slots = pendingImages(2, '16:9');
    const current = [
      { id: 'old', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,OLD' },
      ...slots,
    ] satisfies ResultImage[];

    const next = applyGenerateEvent(current, {
      slotId: slots[1]!.id,
      url: 'data:image/png;base64,NEW',
    });

    expect(next[0]).toBe(current[0]);
    expect(next[2]).toMatchObject({
      id: slots[1]!.id,
      status: 'ready',
      url: 'data:image/png;base64,NEW',
    });
  });

  it('只有点选且就绪的图片可作为精修标准', () => {
    const images: ResultImage[] = [
      { id: 'failed', aspectRatio: '1:1', status: 'failed' },
      { id: 'ready', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,READY' },
      { id: 'side', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,SIDE' },
    ];

    expect(getSelectedImageUrl(images, 'failed')).toBeNull();
    expect(getSelectedImageUrl(images, null)).toBeNull();
    expect(getSelectedImageUrl(images, 'ready')).toBe('data:image/png;base64,READY');
    expect(getSelectedImageUrls(images, ['side', 'ready', 'failed'])).toEqual([
      'data:image/png;base64,SIDE',
      'data:image/png;base64,READY',
    ]);
    expect(hasReadyImage(images)).toBe(true);
  });

  it('丢掉本批 pending 占位并保留已完成结果', () => {
    const images: ResultImage[] = [
      { id: 'a', aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,OLD' },
      { id: 'b', aspectRatio: '1:1', status: 'pending' },
      { id: 'c', aspectRatio: '1:1', status: 'failed', error: '失败' },
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

  it('精修标准可切换且达上限拒绝追加', () => {
    expect(toggleSelectedId(['a'], 'b', 6)).toEqual({ ids: ['a', 'b'], atLimit: false });
    expect(toggleSelectedId(['a', 'b'], 'a', 6)).toEqual({ ids: ['b'], atLimit: false });
    expect(toggleSelectedId(['a', 'b'], 'c', 2)).toEqual({ ids: ['a', 'b'], atLimit: true });
  });

  it('读取精修快照时只认 id，旧快照的数字下标按未选中处理', () => {
    const results: ResultImage[] = [
      { id: 'legacy-0', aspectRatio: '1:1', status: 'ready', url: '/api/img/0' },
      { id: 'legacy-1', aspectRatio: '1:1', status: 'ready', url: '/api/img/1' },
    ];

    expect(readSelectedIds({ selectedIds: ['legacy-1', 'ghost'] }, results)).toEqual(['legacy-1']);
    expect(readSelectedIds({}, results)).toEqual([]);
    expect(
      readRefineStepSnapshot({
        form: DEFAULT_REFINE_FORM,
        images: [],
        results,
        selectedIndexes: [0, 1],
        needsMultiview: true,
      })?.selectedIds,
    ).toEqual([]);
  });

  it('精修请求固定生成数量为 1，按上传原图组装参考图并带槽位 id', async () => {
    await expect(
      toRefinePayload(
        { ...DEFAULT_REFINE_FORM, count: '3', requirement: ' 优化光影 ' },
        [{ uid: 'u1', previewUrl: 'data:image/png;base64,AA==' }],
        ['slot-a'],
      ),
    ).resolves.toMatchObject({
      kind: 'productRefine',
      count: 1,
      refineRequirement: '优化光影',
      images: [{ dataUrl: 'data:image/png;base64,AA==' }],
      slotIds: ['slot-a'],
    });
  });

  it('多视角请求固定生成数量为 1，携带全部精修标准图与槽位 id', () => {
    expect(
      toMultiviewPayload(
        { ...DEFAULT_MULTIVIEW_FORM, count: '3', requirement: ' 生成六个统一视角 ' },
        ['data:image/png;base64,REFINED', 'data:image/png;base64,SIDE'],
        ['slot-m'],
      ),
    ).toMatchObject({
      kind: 'productMultiview',
      count: 1,
      multiviewRequirement: '生成六个统一视角',
      refinedImageDataUrls: ['data:image/png;base64,REFINED', 'data:image/png;base64,SIDE'],
      slotIds: ['slot-m'],
    });
  });
});

describe('isSameStepSnapshot', () => {
  it('无基线视为已变化', () => {
    expect(isSameStepSnapshot({ form: DEFAULT_MULTIVIEW_FORM, results: [] }, undefined)).toBe(
      false,
    );
  });

  it('选中 id 变化则不相等', () => {
    const baseline = {
      form: DEFAULT_MULTIVIEW_FORM,
      images: [],
      results: [{ id: 'a', aspectRatio: '1:1', status: 'ready', url: '/api/img/1' }],
      selectedIds: ['a'],
      needsMultiview: true,
    };
    expect(isSameStepSnapshot({ ...baseline, selectedIds: ['b'] }, baseline)).toBe(false);
    expect(isSameStepSnapshot(baseline, baseline)).toBe(true);
  });

  it('结果 URL 变化则不相等', () => {
    const baseline = {
      form: DEFAULT_MULTIVIEW_FORM,
      results: [{ id: 'a', aspectRatio: '1:1', status: 'ready', url: '/api/img/old' }],
    };
    expect(
      isSameStepSnapshot(
        {
          ...baseline,
          results: [{ id: 'a', aspectRatio: '1:1', status: 'ready', url: '/api/img/new' }],
        },
        baseline,
      ),
    ).toBe(false);
  });
});
