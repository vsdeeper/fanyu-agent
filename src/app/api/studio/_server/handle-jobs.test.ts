import type BetterSqlite3 from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const holders = vi.hoisted(() => ({ sqlite: null as unknown }));

vi.mock('@/lib/db/client', async () => {
  const { default: Database } = await import('better-sqlite3');
  const { drizzle } = await import('drizzle-orm/better-sqlite3');
  if (!holders.sqlite) {
    const sqlite = new Database(':memory:');
    sqlite.exec(`
      CREATE TABLE studio_jobs (
        id text PRIMARY KEY NOT NULL,
        product text NOT NULL,
        task_id text NOT NULL,
        step_key text NOT NULL,
        kind text NOT NULL,
        status text NOT NULL,
        data text NOT NULL,
        error text,
        created_at text NOT NULL,
        updated_at text NOT NULL,
        finished_at text
      );
    `);
    holders.sqlite = sqlite;
  }
  return { getDb: () => drizzle(holders.sqlite as never) };
});

import { ApiErrorCode } from '@/lib/shared/server/api-response';
import type { StudioGenerateRequest } from '../_shared/generate-types';
import { ECOMMERCE_JOB_STEP_KEYS } from '../ecommerce/_shared/task-constants';
import { createStudioJobHandlers } from './handle-jobs';
import { releaseJobController } from './job-registry';

const sqlite = () => holders.sqlite as BetterSqlite3.Database;

const BODY: StudioGenerateRequest = {
  kind: 'visual',
  model: 'seedream',
  aspectRatio: '1:1',
  quality: 'high',
  clarity: '2K',
  count: 1,
  analysisText: '分析',
  productViewImages: [
    { filename: 'a.png', mediaType: 'image/png', dataUrl: 'data:image/png;base64,a' },
  ],
};

const PENDING = {
  stepKey: 'visual',
  batchStartIndex: 0,
  slots: [{ index: 0, aspectRatio: '1:1', status: 'pending' as const }],
  form: { model: 'seedream', aspectRatio: '1:1', quality: 'high', clarity: '2K', count: '1' },
};

function createRequest(overrides: Record<string, unknown> = {}): Request {
  return new Request('https://example.test/api/studio/ecommerce/tasks/task-1/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stepKey: 'visual',
      kind: 'generate',
      pending: PENDING,
      body: BODY,
      ...overrides,
    }),
  });
}

const scheduled: Array<() => Promise<void>> = [];
let taskExists = true;

const handlers = createStudioJobHandlers({
  product: 'ecommerce',
  logTag: 'test-jobs',
  notFoundMessage: '电商设计任务不存在',
  stepKeys: ECOMMERCE_JOB_STEP_KEYS,
  taskExists: () => taskExists,
  producer: () => async () => {},
  schedule: (run) => {
    scheduled.push(run);
  },
});

async function createJobId(req = createRequest()): Promise<string> {
  const body = await (await handlers.handleCreateJob('task-1', req)).json();
  return body.data.jobId;
}

beforeEach(() => {
  sqlite().exec('DELETE FROM studio_jobs');
  scheduled.length = 0;
  taskExists = true;
});

describe('建作业', () => {
  it('请求体非法返回 400', async () => {
    const res = await handlers.handleCreateJob(
      'task-1',
      new Request('https://example.test/x', { method: 'POST', body: 'not json' }),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).code).toBe(ApiErrorCode.INVALID_PARAMS);
  });

  it('步骤不在允许集合内返回 400（分析不入作业）', async () => {
    const res = await handlers.handleCreateJob(
      'task-1',
      createRequest({ stepKey: 'analysis', pending: { ...PENDING, stepKey: 'analysis' } }),
    );

    expect(res.status).toBe(400);
  });

  it('任务不存在返回 404', async () => {
    taskExists = false;
    const res = await handlers.handleCreateJob('task-1', createRequest());

    expect(res.status).toBe(404);
    expect((await res.json()).code).toBe(ApiErrorCode.TASK_NOT_FOUND);
  });

  it('正常创建返回 jobId 并调度一次执行', async () => {
    const res = await handlers.handleCreateJob('task-1', createRequest());

    expect(res.status).toBe(200);
    expect((await res.json()).data.jobId).toBeTruthy();
    expect(scheduled).toHaveLength(1);
  });

  it('重复提交幂等返回同一 jobId，且不重复调度', async () => {
    const first = await createJobId();
    const second = await createJobId();

    expect(second).toBe(first);
    expect(scheduled).toHaveLength(1);
  });

  it('无登记控制器的 running 视为重启遗留孤儿，重新建出新作业', async () => {
    const orphan = await createJobId();
    // 模拟进程重启：DB 里的 running 还在，但本进程已无对应运行器
    releaseJobController(orphan);

    const fresh = await createJobId();

    expect(fresh).not.toBe(orphan);
    expect(scheduled).toHaveLength(2);
  });
});

describe('列表与取消', () => {
  it('列表返回该任务的作业，新在前', async () => {
    const jobId = await createJobId();
    const res = handlers.handleListJobs('task-1');
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.items.map((job: { id: string }) => job.id)).toEqual([jobId]);
  });

  it('取消运行中作业返回 cancelled', async () => {
    const jobId = await createJobId();
    const res = handlers.handleCancelJob('task-1', jobId);

    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ jobId, status: 'cancelled' });
  });

  it('重复取消已结束作业返回 409', async () => {
    const jobId = await createJobId();
    handlers.handleCancelJob('task-1', jobId);

    const res = handlers.handleCancelJob('task-1', jobId);

    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe(ApiErrorCode.JOB_NOT_CANCELLABLE);
  });

  it('取消不存在或不属于该任务的作业返回 404', async () => {
    const jobId = await createJobId();

    expect(handlers.handleCancelJob('task-1', 'nope').status).toBe(404);
    expect(handlers.handleCancelJob('task-2', jobId).status).toBe(404);
  });

  it('取消后立刻重跑能建出新作业', async () => {
    const jobId = await createJobId();
    handlers.handleCancelJob('task-1', jobId);

    const next = await createJobId();

    expect(next).not.toBe(jobId);
    expect(scheduled).toHaveLength(2);
  });
});
