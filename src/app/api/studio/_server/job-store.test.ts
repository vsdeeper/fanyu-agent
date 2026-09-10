import type BetterSqlite3 from 'better-sqlite3';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const holders = vi.hoisted(() => ({ sqlite: null as unknown }));

// 用真实内存库而非手写 mock 链：本模块的被测逻辑就是 SQL（条件化 UPDATE、
// 事务内先查后插、sweep 的时间窗），把 drizzle 链 mock 掉等于什么都没测。
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

import {
  createJob,
  deleteJobsByTask,
  failJob,
  finishJob,
  getJob,
  hasRunningJob,
  isJobRunning,
  listJobsByTask,
  listRunningJobKeys,
  requestCancelJob,
  sweepStaleJobs,
  updateJobData,
} from './job-store';
import { JOB_HISTORY_LIMIT, JOB_INTERRUPTED_MESSAGE, JOB_STALE_MS } from '../_shared/job-constants';
import type { StudioJobData } from '../_shared/job-types';

const sqlite = () => holders.sqlite as BetterSqlite3.Database;

const PENDING = {
  stepKey: 'visual',
  slots: [{ id: 'slot-0', aspectRatio: '1:1', status: 'pending' as const }],
  form: { model: 'seedream', aspectRatio: '1:1', quality: 'high', clarity: '2K', count: '1' },
};

const DATA: StudioJobData = { events: [], pending: PENDING };

function createJobInput(taskId: string, stepKey: string, kind = 'generate') {
  return { product: 'ecommerce', taskId, stepKey, kind, data: DATA };
}

function newJob(taskId: string, stepKey: string, kind = 'generate') {
  return createJob(createJobInput(taskId, stepKey, kind)).job;
}

/** 直接改库把某作业伪装成久未更新，用于触发 sweep。 */
function ageJob(jobId: string, ageMs: number): void {
  sqlite()
    .prepare('UPDATE studio_jobs SET updated_at = ? WHERE id = ?')
    .run(new Date(Date.now() - ageMs).toISOString(), jobId);
}

beforeEach(() => {
  sqlite().exec('DELETE FROM studio_jobs');
});

describe('createJob', () => {
  it('同任务同步骤已有 running 时原样返回它，并由 created 标注未新建', () => {
    const first = createJob(createJobInput('task-1', 'visual'));
    const second = createJob(createJobInput('task-1', 'visual'));

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.job.id).toBe(first.job.id);
    expect(listJobsByTask('task-1')).toHaveLength(1);
  });

  it('不同步骤各自独立建作业', () => {
    const visual = newJob('task-1', 'visual');
    const design = newJob('task-1', 'design');

    expect(design.id).not.toBe(visual.id);
    expect(listJobsByTask('task-1')).toHaveLength(2);
  });

  it('先 sweep 再查重：超窗僵尸不会被当成已有作业返回', () => {
    const zombie = newJob('task-1', 'visual');
    ageJob(zombie.id, JOB_STALE_MS + 1000);

    const fresh = newJob('task-1', 'visual');

    expect(fresh.id).not.toBe(zombie.id);
    expect(getJob(zombie.id)).toMatchObject({
      status: 'failed',
      error: JOB_INTERRUPTED_MESSAGE,
    });
    expect(getJob(fresh.id)?.status).toBe('running');
  });

  it('任务历史裁剪到上限', () => {
    const first = newJob('task-1', 'visual');
    for (let i = 0; i < JOB_HISTORY_LIMIT; i++) {
      finishJob(first.id, DATA);
      newJob('task-1', 'visual');
    }

    expect(listJobsByTask('task-1', JOB_HISTORY_LIMIT + 50).length).toBeLessThanOrEqual(
      JOB_HISTORY_LIMIT,
    );
  });
});

describe('终态写入的条件化', () => {
  it('finishJob 对已取消作业返回 false 且不改状态', () => {
    const job = newJob('task-1', 'visual');
    requestCancelJob(job.id);

    expect(finishJob(job.id, DATA)).toBe(false);
    expect(getJob(job.id)?.status).toBe('cancelled');
  });

  it('failJob 对已成功作业返回 false 且不改状态', () => {
    const job = newJob('task-1', 'visual');
    finishJob(job.id, DATA);

    expect(failJob(job.id, 'boom')).toBe(false);
    expect(getJob(job.id)?.status).toBe('succeeded');
  });

  it('updateJobData 对非 running 作业返回 false', () => {
    const job = newJob('task-1', 'visual');
    requestCancelJob(job.id);

    expect(updateJobData(job.id, DATA)).toBe(false);
  });

  it('requestCancelJob 只动 running，重复取消返回 false', () => {
    const job = newJob('task-1', 'visual');

    expect(requestCancelJob(job.id)).toBe(true);
    expect(requestCancelJob(job.id)).toBe(false);
    expect(getJob(job.id)?.status).toBe('cancelled');
  });
});

describe('sweepStaleJobs', () => {
  it('只清超窗的 running，不碰未超窗与已终态的作业', () => {
    const stale = newJob('task-1', 'visual');
    const fresh = newJob('task-2', 'visual');
    const done = newJob('task-3', 'visual');
    finishJob(done.id, DATA);

    ageJob(stale.id, JOB_STALE_MS + 1000);
    ageJob(done.id, JOB_STALE_MS + 1000);

    expect(sweepStaleJobs()).toBe(1);
    expect(getJob(stale.id)?.status).toBe('failed');
    expect(getJob(fresh.id)?.status).toBe('running');
    expect(getJob(done.id)?.status).toBe('succeeded');
  });
});

describe('查询', () => {
  it('listRunningJobKeys 只回运行中的任务，供列表页展示生成中', () => {
    const running = newJob('task-1', 'visual');
    const finished = newJob('task-2', 'design');
    finishJob(finished.id, DATA);
    newJob('task-3', 'design');

    expect(listRunningJobKeys(['task-1', 'task-2'])).toEqual(new Map([['task-1', 'visual']]));
    expect(listRunningJobKeys([])).toEqual(new Map());
    expect(running.status).toBe('running');
  });

  it('hasRunningJob 与 isJobRunning 反映当前状态', () => {
    const job = newJob('task-1', 'visual');

    expect(hasRunningJob('task-1', 'visual')).toBe(true);
    expect(hasRunningJob('task-1', 'design')).toBe(false);
    expect(isJobRunning(job.id)).toBe(true);

    requestCancelJob(job.id);

    expect(hasRunningJob('task-1', 'visual')).toBe(false);
    expect(isJobRunning(job.id)).toBe(false);
  });

  it('listJobsByTask 按创建时间新在前', () => {
    const first = newJob('task-1', 'visual');
    finishJob(first.id, DATA);
    const second = newJob('task-1', 'design');

    expect(listJobsByTask('task-1').map((job) => job.id)).toEqual([second.id, first.id]);
  });

  it('deleteJobsByTask 清空该任务全部作业', () => {
    newJob('task-1', 'visual');
    newJob('task-2', 'visual');

    deleteJobsByTask('task-1');

    expect(listJobsByTask('task-1')).toEqual([]);
    expect(listJobsByTask('task-2')).toHaveLength(1);
  });
});
