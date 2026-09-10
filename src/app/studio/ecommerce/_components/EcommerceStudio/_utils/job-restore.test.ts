import { describe, expect, it } from 'vitest';

import type { StudioGenerateImageEvent } from '@/app/api/studio/_shared/generate-types';
import type { StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import {
  applyJobEvents,
  jobGeneratingPhase,
  mergeBatchGroups,
  mergeBatchImages,
  restoreBatchImages,
  shouldAdvancePhase,
} from './job-restore';

const slot = (index: number, themeId?: string): StudioResultImage => ({
  index,
  aspectRatio: '1:1',
  status: 'pending',
  ...(themeId ? { themeId, themeTitle: `主题${themeId}` } : {}),
});

/** 作业事件的 index 是**批次内相对下标**；这里模拟第二批（batchStartIndex = 5）。 */
function jobOf(
  events: StudioGenerateImageEvent[],
  slots: StudioResultImage[],
  batchStartIndex: number,
): StudioJobSnapshot {
  return {
    id: 'job-1',
    product: 'ecommerce',
    taskId: 'task-1',
    stepKey: 'visual',
    kind: 'generate',
    status: 'running',
    data: {
      events,
      pending: {
        stepKey: 'visual',
        batchStartIndex,
        slots,
        form: { model: 'm', aspectRatio: '1:1', quality: 'high', clarity: '2K', count: '2' },
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('applyJobEvents 的批次偏移', () => {
  it('事件 index 是批次内相对下标，需按 batchStartIndex 换算成绝对下标', () => {
    // 第二批：绝对下标从 5 起，而事件的 index 从 0 起
    const result = applyJobEvents(
      [slot(5), slot(6)],
      [
        { index: 0, url: '/assets/a' },
        { index: 1, error: '生图服务暂不可用' },
      ],
      5,
    );

    expect(result).toEqual([
      { index: 5, aspectRatio: '1:1', status: 'ready', url: '/assets/a' },
      { index: 6, aspectRatio: '1:1', status: 'failed', error: '生图服务暂不可用' },
    ]);
  });

  it('后续批次既不漏绑自己，也不覆盖早先批次的同相对下标结果', () => {
    const priorBatch: StudioResultImage[] = [
      { index: 0, aspectRatio: '1:1', status: 'ready', url: '/assets/first' },
    ];
    // 第二批：相对 index 同为 0，但绝对下标是 13
    const newBatch = applyJobEvents([slot(13)], [{ index: 0, url: '/assets/second' }], 13);

    const merged = mergeBatchImages(priorBatch, newBatch);

    // mergeBatchImages 返回「按下标排序的数组」，故按 index 查找而非按位置取
    // 漏掉偏移时，第二批会绑不上（index 13 仍是 pending），这里正是曾经的漏图成因
    expect(merged.find((item) => item.index === 0)).toEqual({
      index: 0,
      aspectRatio: '1:1',
      status: 'ready',
      url: '/assets/first',
    });
    expect(merged.find((item) => item.index === 13)).toMatchObject({
      status: 'ready',
      url: '/assets/second',
    });
  });

  it('首批 batchStartIndex 为 0 时行为与旧流式路径一致', () => {
    const result = applyJobEvents([slot(0), slot(1)], [{ index: 1, url: '/assets/b' }], 0);

    expect(result[0]?.status).toBe('pending');
    expect(result[1]).toMatchObject({ status: 'ready', url: '/assets/b' });
  });

  it('from 只消费增量，跳过已套用的事件', () => {
    const events: StudioGenerateImageEvent[] = [
      { index: 0, url: '/assets/a' },
      { index: 1, url: '/assets/b' },
    ];

    const result = applyJobEvents([slot(0), slot(1)], events, 0, 1);

    expect(result[0]?.status).toBe('pending');
    expect(result[1]?.url).toBe('/assets/b');
  });

  it('保留主题分组信息', () => {
    const result = applyJobEvents([slot(0, 't1')], [{ index: 0, url: '/assets/a' }], 0);

    expect(result[0]).toMatchObject({ themeId: 't1', themeTitle: '主题t1', url: '/assets/a' });
  });
});

describe('mergeBatchImages', () => {
  it('按 index 合并，不要求既有长度恰好等于批次起始下标', () => {
    const prior = [slot(0), slot(1)];
    const batch = applyJobEvents([slot(2)], [{ index: 0, url: '/assets/c' }], 2);

    const merged = mergeBatchImages(prior, batch);

    expect(merged.map((item) => item.index)).toEqual([0, 1, 2]);
    expect(merged[2]).toMatchObject({ status: 'ready', url: '/assets/c' });
  });

  it('同 index 以新批次为准，且结果按下标升序', () => {
    const prior: StudioResultImage[] = [{ index: 1, aspectRatio: '1:1', status: 'pending' }];
    const batch: StudioResultImage[] = [
      { index: 1, aspectRatio: '1:1', status: 'ready', url: '/assets/new' },
      { index: 0, aspectRatio: '1:1', status: 'ready', url: '/assets/zero' },
    ];

    expect(mergeBatchImages(prior, batch)).toEqual([
      { index: 0, aspectRatio: '1:1', status: 'ready', url: '/assets/zero' },
      { index: 1, aspectRatio: '1:1', status: 'ready', url: '/assets/new' },
    ]);
  });
});

describe('mergeBatchGroups', () => {
  it('只并入指定任务类型，其他分组原样保留', () => {
    const prior = {
      主图: [slot(0)],
      营销海报: [{ index: 9, aspectRatio: '1:1' as const, status: 'ready' as const, url: '/x' }],
    };
    const merged = mergeBatchGroups(prior, '主图', [
      { index: 1, aspectRatio: '1:1', status: 'ready', url: '/assets/b' },
    ]);

    expect(merged['主图']?.map((item) => item.index)).toEqual([0, 1]);
    expect(merged['营销海报']).toEqual(prior['营销海报']);
  });

  it('目标分组此前不存在时直接建立', () => {
    expect(mergeBatchGroups({}, '详情图', [slot(0)])['详情图']).toHaveLength(1);
  });
});

describe('restoreBatchImages', () => {
  it('用作业自带的 batchStartIndex 重建带结果的批次', () => {
    const job = jobOf([{ index: 0, url: '/assets/a' }], [slot(13), slot(14)], 13);

    expect(restoreBatchImages(job)).toEqual([
      { index: 13, aspectRatio: '1:1', status: 'ready', url: '/assets/a' },
      { index: 14, aspectRatio: '1:1', status: 'pending' },
    ]);
  });
});

describe('shouldAdvancePhase', () => {
  it('用户仍停在该生成相位时推进到结果步', () => {
    expect(
      shouldAdvancePhase({
        jobStepKey: 'design',
        currentPhase: 'designGenerating',
        settledAtMount: false,
      }),
    ).toBe(true);
  });

  it('生成中退回上一步后不推进 —— 否则会把用户从刚退到的步骤拽回来', () => {
    expect(
      shouldAdvancePhase({
        jobStepKey: 'design',
        currentPhase: 'analyzed',
        settledAtMount: false,
      }),
    ).toBe(false);
    expect(
      shouldAdvancePhase({
        jobStepKey: 'design',
        currentPhase: 'visual',
        settledAtMount: false,
      }),
    ).toBe(false);
  });

  it('挂载时作业已终态的只补落库，即使相位恰好是生成相位也不推进', () => {
    expect(
      shouldAdvancePhase({
        jobStepKey: 'visual',
        currentPhase: 'visualGenerating',
        settledAtMount: true,
      }),
    ).toBe(false);
  });

  it('步骤不属于出图时不推进', () => {
    expect(
      shouldAdvancePhase({
        jobStepKey: 'analysis',
        currentPhase: 'analyzing',
        settledAtMount: false,
      }),
    ).toBe(false);
  });
});

describe('jobGeneratingPhase', () => {
  it('只认两步出图，分析不入作业', () => {
    expect(jobGeneratingPhase('visual')).toBe('visualGenerating');
    expect(jobGeneratingPhase('design')).toBe('designGenerating');
    expect(jobGeneratingPhase('analysis')).toBeNull();
  });
});
