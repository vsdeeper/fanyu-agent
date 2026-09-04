import { describe, expect, it } from 'vitest';
import { DEFAULT_DESIGN_FORM_STATE } from './constants';
import { isNextDisabled } from './ResultPanel/utils';
import type { StudioResultImage } from './types';
import {
  appendPendingDesignImages,
  applyDesignGenerateEvent,
  applyGenerateEvent,
  pendingImagesFromCount,
  phaseAfterNext,
  phaseAfterPrev,
  toDesignGeneratePayload,
} from './utils';

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

describe('视觉设计请求体', () => {
  it('固定传分析与产品图，并按开关传主视觉和模特图', () => {
    expect(
      toDesignGeneratePayload(
        DEFAULT_DESIGN_FORM_STATE,
        ' 商业分析 ',
        'data:image/png;base64,product',
        'data:image/png;base64,visual',
        'data:image/png;base64,model',
      ),
    ).toMatchObject({
      kind: 'design',
      designType: '主图',
      referenceVisual: true,
      includeModel: true,
      analysisText: '商业分析',
      productViewDataUrl: 'data:image/png;base64,product',
      visualDataUrl: 'data:image/png;base64,visual',
      modelDataUrl: 'data:image/png;base64,model',
    });
  });

  it('关闭开关时省略对应参考图', () => {
    const payload = toDesignGeneratePayload(
      { ...DEFAULT_DESIGN_FORM_STATE, referenceVisual: false, includeModel: false },
      '商业分析',
      'data:image/png;base64,product',
      'data:image/png;base64,visual',
      'data:image/png;base64,model',
    );

    expect(payload).not.toHaveProperty('visualDataUrl');
    expect(payload).not.toHaveProperty('modelDataUrl');
    expect(payload).toHaveProperty('productViewDataUrl');
  });
});

describe('视觉设计结果分组', () => {
  it('同类型连续生成追加，切换类型后互不覆盖', () => {
    let groups = appendPendingDesignImages({}, '主图', 1, '1:1');
    groups = applyDesignGenerateEvent(
      groups,
      '主图',
      { index: 0, url: 'data:image/png;base64,main' },
      0,
    );
    groups = appendPendingDesignImages(groups, '主图', 1, '16:9');
    groups = appendPendingDesignImages(groups, '营销海报', 1, '3:4');

    expect(groups['主图']).toHaveLength(2);
    expect(groups['主图']?.[0].status).toBe('ready');
    expect(groups['主图']?.[1]).toMatchObject({ index: 1, aspectRatio: '16:9' });
    expect(groups['营销海报']).toEqual([{ index: 0, aspectRatio: '3:4', status: 'pending' }]);
  });
});

describe('第五步导航', () => {
  it('模特步骤进入视觉设计，视觉设计返回模特步骤', () => {
    expect(phaseAfterNext('model')).toBe('design');
    expect(phaseAfterPrev('design')).toBe('model');
    expect(phaseAfterPrev('designGenerating')).toBe('model');
  });

  it('第四步未选择模特标准时禁止进入第五步', () => {
    expect(isNextDisabled('model', '分析', 0, 0, null)).toBe(true);
    expect(isNextDisabled('model', '分析', 0, 0, 2)).toBe(false);
  });
});
