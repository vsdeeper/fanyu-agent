import { describe, expect, it } from 'vitest';

import type { StudioGenerateImageEvent } from '@/app/api/studio/_shared/generate-types';
import type { StudioJobPendingSlot, StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import {
  applyJobEvents,
  jobGeneratingPhase,
  mergeBatchGroups,
  mergeBatchImages,
  restoreBatchImages,
  shouldAdvancePhase,
  syncJobSlots,
} from './job-restore';

const slot = (id: string, themeId?: string): StudioResultImage => ({
  id,
  aspectRatio: '1:1',
  status: 'pending',
  ...(themeId ? { themeId, themeTitle: `主题${themeId}` } : {}),
});

function jobOf(
  events: StudioGenerateImageEvent[],
  slots: StudioJobPendingSlot[],
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
        slots,
        form: { model: 'm', aspectRatio: '1:1', quality: 'high', clarity: '2K', count: '2' },
      },
    },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('applyJobEvents', () => {
  it('按槽位 id 命中，成功与失败分别写状态', () => {
    const result = applyJobEvents(
      [slot('a'), slot('b')],
      [
        { slotId: 'a', url: '/assets/a' },
        { slotId: 'b', error: '生图服务暂不可用' },
      ],
    );

    expect(result).toEqual([
      { id: 'a', aspectRatio: '1:1', status: 'ready', url: '/assets/a' },
      { id: 'b', aspectRatio: '1:1', status: 'failed', error: '生图服务暂不可用' },
    ]);
  });

  it('事件指向不存在的槽位时原样返回，不误伤别的槽', () => {
    const result = applyJobEvents([slot('a')], [{ slotId: 'ghost', url: '/assets/x' }]);

    expect(result).toEqual([slot('a')]);
  });

  it('from 只消费增量，跳过已套用的事件', () => {
    const events: StudioGenerateImageEvent[] = [
      { slotId: 'a', url: '/assets/a' },
      { slotId: 'b', url: '/assets/b' },
    ];

    const result = applyJobEvents([slot('a'), slot('b')], events, 1);

    expect(result[0]?.status).toBe('pending');
    expect(result[1]?.url).toBe('/assets/b');
  });

  it('保留主题分组信息', () => {
    const result = applyJobEvents([slot('a', 't1')], [{ slotId: 'a', url: '/assets/a' }]);

    expect(result[0]).toMatchObject({ themeId: 't1', themeTitle: '主题t1', url: '/assets/a' });
  });
});

describe('mergeBatchImages', () => {
  it('异 id 一律追加，不要求既有长度恰好等于批次起始位置', () => {
    const prior = [slot('a'), slot('b')];
    const batch = applyJobEvents([slot('c')], [{ slotId: 'c', url: '/assets/c' }]);

    const merged = mergeBatchImages(prior, batch);

    expect(merged.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(merged[2]).toMatchObject({ status: 'ready', url: '/assets/c' });
  });

  it('同 id 以新批次为准，且既有元素位置不动', () => {
    const prior: StudioResultImage[] = [{ id: 'a', aspectRatio: '1:1', status: 'pending' }];
    const batch: StudioResultImage[] = [
      { id: 'b', aspectRatio: '1:1', status: 'ready', url: '/assets/b' },
      { id: 'a', aspectRatio: '1:1', status: 'ready', url: '/assets/new' },
    ];

    expect(mergeBatchImages(prior, batch)).toEqual([
      { id: 'a', aspectRatio: '1:1', status: 'ready', url: '/assets/new' },
      { id: 'b', aspectRatio: '1:1', status: 'ready', url: '/assets/b' },
    ]);
  });
});

describe('mergeBatchGroups', () => {
  it('只并入指定任务类型，其他分组原样保留', () => {
    const prior = {
      主图: [slot('a')],
      营销海报: [{ id: 'p', aspectRatio: '1:1' as const, status: 'ready' as const, url: '/x' }],
    };
    const merged = mergeBatchGroups(prior, '主图', [
      { id: 'b', aspectRatio: '1:1', status: 'ready', url: '/assets/b' },
    ]);

    expect(merged['主图']?.map((item) => item.id)).toEqual(['a', 'b']);
    expect(merged['营销海报']).toEqual(prior['营销海报']);
  });

  it('目标分组此前不存在时直接建立', () => {
    expect(mergeBatchGroups({}, '详情图', [slot('a')])['详情图']).toHaveLength(1);
  });
});

describe('restoreBatchImages', () => {
  it('按作业回显的槽位 id 重建带结果的批次', () => {
    const job = jobOf([{ slotId: 's13', url: '/assets/a' }], [slot('s13'), slot('s14')]);

    expect(restoreBatchImages(job)).toEqual([
      { id: 's13', aspectRatio: '1:1', status: 'ready', url: '/assets/a' },
      { id: 's14', aspectRatio: '1:1', status: 'pending' },
    ]);
  });
});

describe('syncJobSlots', () => {
  it('丢弃服务端不认得的本地 pending 槽位，并并入服务端槽位', () => {
    // 建作业幂等命中旧作业时，服务端认的是 slot-server，本地新建的 slot-local 收不到任何事件
    const current: StudioResultImage[] = [
      { id: 'old', aspectRatio: '1:1', status: 'ready', url: '/assets/old' },
      slot('slot-local'),
    ];

    const synced = syncJobSlots(current, [slot('slot-server')]);

    expect(synced).toEqual([
      { id: 'old', aspectRatio: '1:1', status: 'ready', url: '/assets/old' },
      { id: 'slot-server', aspectRatio: '1:1', status: 'pending' },
    ]);
  });

  it('服务端认得的槽位同 id 覆盖，已就绪结果不受影响', () => {
    const current: StudioResultImage[] = [slot('slot-a')];

    const synced = syncJobSlots(current, [{ ...slot('slot-a'), status: 'ready', url: '/n' }]);

    expect(synced).toEqual([{ id: 'slot-a', aspectRatio: '1:1', status: 'ready', url: '/n' }]);
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
