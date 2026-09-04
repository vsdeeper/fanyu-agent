import { describe, expect, it } from 'vitest';
import type { StudioResultImage } from './types';
import { applyGenerateEvent, pendingImagesFromCount } from './utils';

describe('pendingImagesFromCount', () => {
  it('连续批次使用不冲突的索引并保留各自尺寸比例', () => {
    const firstBatch = pendingImagesFromCount(2, 0, '1:1');
    const secondBatch = pendingImagesFromCount(2, firstBatch.length, '16:9');

    expect([...firstBatch, ...secondBatch]).toEqual([
      { index: 0, aspectRatio: '1:1', status: 'pending' },
      { index: 1, aspectRatio: '1:1', status: 'pending' },
      { index: 2, aspectRatio: '16:9', status: 'pending' },
      { index: 3, aspectRatio: '16:9', status: 'pending' },
    ]);
  });
});

describe('applyGenerateEvent', () => {
  it('只按批次偏移更新新追加的槽位', () => {
    const current: StudioResultImage[] = [
      { index: 0, aspectRatio: '1:1', status: 'ready', url: 'data:image/png;base64,old' },
      { index: 1, aspectRatio: '1:1', status: 'failed', error: '旧批次失败' },
      ...pendingImagesFromCount(2, 2, '16:9'),
    ];

    const next = applyGenerateEvent(current, { index: 0, url: 'data:image/png;base64,new' }, 2);

    expect(next).toEqual([
      current[0],
      current[1],
      { index: 2, aspectRatio: '16:9', status: 'ready', url: 'data:image/png;base64,new' },
      current[3],
    ]);
  });

  it('新批次失败事件不改写旧批次状态', () => {
    const current: StudioResultImage[] = [
      { index: 0, aspectRatio: '4:3', status: 'ready', url: 'data:image/png;base64,old' },
      ...pendingImagesFromCount(1, 1, '3:4'),
    ];

    const next = applyGenerateEvent(current, { index: 0, error: '生成失败' }, 1);

    expect(next[0]).toBe(current[0]);
    expect(next[1]).toEqual({
      index: 1,
      aspectRatio: '3:4',
      status: 'failed',
      error: '生成失败',
    });
  });
});
