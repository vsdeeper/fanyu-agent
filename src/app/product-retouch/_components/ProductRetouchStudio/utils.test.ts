import { describe, expect, it } from 'vitest';
import type { ResultImage } from './types';
import {
  applyGenerateEvent,
  getSelectedImageUrl,
  hasReadyImage,
  pendingImages,
  phaseAfterNext,
  phaseAfterPrev,
  toMultiviewPayload,
} from './utils';
import { DEFAULT_MULTIVIEW_FORM } from './constants';

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
    ];

    expect(getSelectedImageUrl(images, 0)).toBeNull();
    expect(getSelectedImageUrl(images, 1)).toBe('data:image/png;base64,READY');
    expect(hasReadyImage(images)).toBe(true);
  });
});

describe('产品精修步骤与请求', () => {
  it('按多视角选项进入第二步或直接完成', () => {
    expect(phaseAfterNext('refine', true)).toBe('multiview');
    expect(phaseAfterNext('refine', false)).toBe('complete');
    expect(phaseAfterNext('refineGenerating', false)).toBe('refineGenerating');
    expect(phaseAfterPrev('multiview', true)).toBe('refine');
    expect(phaseAfterPrev('complete', true)).toBe('multiview');
    expect(phaseAfterPrev('complete', false)).toBe('refine');
  });

  it('多视角请求携带用户要求与精修标准图', () => {
    expect(
      toMultiviewPayload(
        { ...DEFAULT_MULTIVIEW_FORM, requirement: ' 生成六个统一视角 ' },
        'data:image/png;base64,REFINED',
      ),
    ).toMatchObject({
      kind: 'productMultiview',
      multiviewRequirement: '生成六个统一视角',
      refinedImageDataUrl: 'data:image/png;base64,REFINED',
    });
  });
});
