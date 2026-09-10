import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
// job-runner 顶层会 import 真实 store/registry 作为默认 deps，但本测试全程注入 fake，不会触到数据库。
vi.mock('@/lib/db/client', () => ({ getDb: () => ({}) }));

import {
  JobDeadlineExceededError,
  runStudioJob,
  type JobRunnerDeps,
  type StudioJobProducerContext,
} from './job-runner';
import {
  JOB_DEADLINE_EXCEEDED_MESSAGE,
  JOB_GENERATE_FAILED_MESSAGE,
} from '../_shared/job-constants';
import type { StudioJobData } from '../_shared/job-types';

const PENDING: StudioJobData['pending'] = {
  stepKey: 'visual',
  batchStartIndex: 0,
  slots: [{ index: 0, aspectRatio: '1:1', status: 'pending' }],
  form: { model: 'seedream', aspectRatio: '1:1', quality: 'high', clarity: '2K', count: '2' },
};

type Calls = {
  updates: StudioJobData[];
  finished: StudioJobData[];
  failed: Array<{ error: string; data?: StudioJobData }>;
  released: string[];
};

function makeDeps(overrides: Partial<JobRunnerDeps> = {}) {
  const calls: Calls = { updates: [], finished: [], failed: [], released: [] };
  const deps: JobRunnerDeps = {
    updateData: (_jobId, data) => {
      calls.updates.push(data);
      return true;
    },
    finish: (_jobId, data) => {
      calls.finished.push(data);
      return true;
    },
    fail: (_jobId, error, data) => {
      calls.failed.push({ error, data });
      return true;
    },
    release: (jobId) => {
      calls.released.push(jobId);
    },
    ...overrides,
  };
  return { deps, calls };
}

/**
 * 生产者会在 runStudioJob 内**同步**开始执行，故这里先建好 controller 再经参数传入，
 * 避免用例闭包在赋值前引用它（TDZ）。
 */
function start(
  deps: JobRunnerDeps,
  producer: (ctx: StudioJobProducerContext & { controller: AbortController }) => Promise<void>,
  deadlineMs = 60_000,
) {
  const controller = new AbortController();
  const promise = runStudioJob(
    {
      jobId: 'job-1',
      pending: PENDING,
      producer: (ctx) => producer({ ...ctx, controller }),
      controller,
      deadlineMs,
    },
    deps,
  );
  return { controller, promise };
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('runStudioJob', () => {
  it('生产完成时落成功终态，data 含全部事件', async () => {
    const { deps, calls } = makeDeps();

    await start(deps, async ({ emit }) => {
      emit({ index: 0, url: '/api/studio/ecommerce/tasks/t/assets/a' });
      emit({ index: 1, error: '生图服务暂不可用' });
    }).promise;

    expect(calls.finished).toHaveLength(1);
    expect(calls.finished[0]?.events).toEqual([
      { index: 0, url: '/api/studio/ecommerce/tasks/t/assets/a' },
      { index: 1, error: '生图服务暂不可用' },
    ]);
    // 每 emit 一次落一次进度
    expect(calls.updates).toHaveLength(2);
    expect(calls.failed).toEqual([]);
    expect(calls.released).toEqual(['job-1']);
  });

  it('生产者抛错时落失败终态，并保留已完成事件', async () => {
    const { deps, calls } = makeDeps();

    await start(deps, async ({ emit }) => {
      emit({ index: 0, url: '/assets/a' });
      throw new Error('upstream exploded');
    }).promise;

    expect(calls.finished).toEqual([]);
    expect(calls.failed).toHaveLength(1);
    expect(calls.failed[0]?.error).toBe(JOB_GENERATE_FAILED_MESSAGE);
    expect(calls.failed[0]?.data?.events).toEqual([{ index: 0, url: '/assets/a' }]);
    expect(calls.released).toEqual(['job-1']);
  });

  it('外部取消时不写终态（取消接口已写），并解除登记', async () => {
    const { deps, calls } = makeDeps();

    const { promise } = start(deps, async ({ signal, controller }) => {
      controller.abort();
      await Promise.resolve();
      expect(signal.aborted).toBe(true);
    });
    await promise;

    expect(calls.finished).toEqual([]);
    expect(calls.failed).toEqual([]);
    expect(calls.released).toEqual(['job-1']);
  });

  it('进度写入失败即中止生产者（作业已被外部取消）', async () => {
    const { deps } = makeDeps({ updateData: () => false });
    let aborted = false;

    await start(deps, async ({ signal, emit }) => {
      emit({ index: 0, url: '/assets/a' });
      aborted = signal.aborted;
    }).promise;

    expect(aborted).toBe(true);
  });

  it('超出总预算时落超时终态，并保留已完成事件', async () => {
    vi.useFakeTimers();
    const { deps, calls } = makeDeps();

    const { controller, promise } = start(
      deps,
      ({ signal, emit }) =>
        new Promise<void>((resolve) => {
          emit({ index: 0, url: '/assets/a' });
          if (signal.aborted) resolve();
          else signal.addEventListener('abort', () => resolve(), { once: true });
        }),
      1_000,
    );

    await vi.advanceTimersByTimeAsync(1_000);

    expect(controller.signal.reason).toBeInstanceOf(JobDeadlineExceededError);
    await promise;

    expect(calls.finished).toEqual([]);
    expect(calls.failed).toHaveLength(1);
    expect(calls.failed[0]?.error).toBe(JOB_DEADLINE_EXCEEDED_MESSAGE);
    expect(calls.failed[0]?.data?.events).toEqual([{ index: 0, url: '/assets/a' }]);
  });
});
