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
  readAnalysisStepSnapshot,
  readDesignStepSnapshot,
  readVisualStepSnapshot,
  resolveInitialStudioPhase,
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
  it('固定传分析与产品图，并按开关传主视觉', () => {
    expect(
      toDesignGeneratePayload(
        DEFAULT_DESIGN_FORM_STATE,
        ' 商业分析 ',
        'data:image/png;base64,product',
        'data:image/png;base64,visual',
      ),
    ).toMatchObject({
      kind: 'design',
      designType: '主图',
      referenceVisual: true,
      includeModel: false,
      analysisText: '商业分析',
      productViewDataUrl: 'data:image/png;base64,product',
      visualDataUrl: 'data:image/png;base64,visual',
    });
  });

  it('关闭开关时省略主视觉参考图', () => {
    const payload = toDesignGeneratePayload(
      { ...DEFAULT_DESIGN_FORM_STATE, referenceVisual: false },
      '商业分析',
      'data:image/png;base64,product',
      'data:image/png;base64,visual',
    );

    expect(payload).not.toHaveProperty('visualDataUrl');
    expect(payload).not.toHaveProperty('modelImages');
    expect(payload).toHaveProperty('includeModel', false);
    expect(payload).toHaveProperty('productViewDataUrl');
  });

  it('营销海报可附带可选模特形象', () => {
    const payload = toDesignGeneratePayload(
      { ...DEFAULT_DESIGN_FORM_STATE, designType: '营销海报', referenceVisual: false },
      '商业分析',
      'data:image/png;base64,product',
      'data:image/png;base64,visual',
      [
        {
          filename: 'model.png',
          mediaType: 'image/png',
          dataUrl: 'data:image/png;base64,model',
        },
      ],
    );

    expect(payload).toMatchObject({
      kind: 'design',
      designType: '营销海报',
      referenceVisual: false,
      includeModel: true,
    });
    expect(payload).not.toHaveProperty('visualDataUrl');
    expect(payload).toHaveProperty('modelImages');
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

describe('步骤快照水合', () => {
  it('恢复分析、主视觉与视觉设计历史数据', () => {
    const analysis = readAnalysisStepSnapshot({
      images: [{ uid: 'img-1', previewUrl: '/api/ecommerce/tasks/t1/assets/a1', name: 'p.png' }],
      documents: [{ uid: 'doc-1', previewUrl: '/api/ecommerce/tasks/t1/assets/a2', name: 's.md' }],
      analysisText: '商业分析正文',
    });
    const visual = readVisualStepSnapshot({
      form: {
        model: 'gpt-image-2-vip',
        aspectRatio: '1:1',
        quality: 'high',
        clarity: '2K',
        count: '2',
      },
      visualImages: [
        { index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/ecommerce/tasks/t1/assets/v1' },
      ],
      selectedVisualIndex: 0,
    });
    const design = readDesignStepSnapshot({
      form: DEFAULT_DESIGN_FORM_STATE,
      designResultGroups: {
        主图: [{ index: 0, aspectRatio: '1:1', status: 'ready', url: '/api/a' }],
      },
    });

    expect(analysis?.analysisText).toBe('商业分析正文');
    expect(analysis?.images[0]?.file).toBeUndefined();
    expect(visual?.selectedVisualIndex).toBe(0);
    expect(design?.designResultGroups['主图']).toHaveLength(1);
    expect(design?.modelImages).toEqual([]);
    expect(readAnalysisStepSnapshot({ images: [] })).toBeUndefined();
  });

  it('再次进入流程时默认停在第一步', () => {
    expect(resolveInitialStudioPhase(undefined)).toBe('input');
    expect(
      resolveInitialStudioPhase({
        images: [],
        documents: [],
        analysisText: '已完成分析',
      }),
    ).toBe('analyzed');
  });
});

describe('四步导航', () => {
  it('分析、主视觉、视觉设计与完成依次流转', () => {
    expect(phaseAfterNext('analyzed')).toBe('visual');
    expect(phaseAfterNext('visual')).toBe('design');
    expect(phaseAfterNext('design')).toBe('complete');
    expect(phaseAfterPrev('complete')).toBe('design');
    expect(phaseAfterPrev('designGenerating')).toBe('visual');
  });

  it('视觉设计至少有一张成果时才能进入完成', () => {
    expect(isNextDisabled('design', '分析', 0, false)).toBe(true);
    expect(isNextDisabled('design', '分析', 0, true)).toBe(false);
  });
});
