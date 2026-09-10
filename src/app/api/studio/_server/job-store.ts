import 'server-only';

import { generateId } from 'ai';
import { and, desc, eq, inArray, lt, sql } from 'drizzle-orm';
import { studioJobs } from '@/lib/db/schema';
import { getDb } from '@/lib/db/client';
import { JOB_HISTORY_LIMIT, JOB_INTERRUPTED_MESSAGE, JOB_STALE_MS } from '../_shared/job-constants';
import type { StudioJobData, StudioJobSnapshot, StudioJobStatus } from '../_shared/job-types';

type JobRow = {
  id: string;
  product: string;
  taskId: string;
  stepKey: string;
  kind: string;
  status: string;
  data: string;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

function toSnapshot(row: JobRow): StudioJobSnapshot {
  return {
    id: row.id,
    product: row.product,
    taskId: row.taskId,
    stepKey: row.stepKey,
    kind: row.kind,
    status: row.status as StudioJobStatus,
    data: JSON.parse(row.data) as StudioJobData,
    ...(row.error ? { error: row.error } : {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...(row.finishedAt ? { finishedAt: row.finishedAt } : {}),
  };
}

function nowIso(): string {
  return new Date().toISOString();
}

type CreateJobInput = {
  product: string;
  taskId: string;
  stepKey: string;
  kind: string;
  data: StudioJobData;
};

/** `created` 为 false 表示幂等命中了已有的 running 作业，调用方不应再启动第二个运行器。 */
export type StudioJobCreateResult = {
  job: StudioJobSnapshot;
  created: boolean;
};

/**
 * 把超时未更新的 running 作业判为中断。进程被强杀时运行器来不及写终态，
 * 只能靠这里回收，否则它会永远占着 running。
 *
 * 不做节流：`status` 有索引，命中 0 行时 SQLite 不产生写入，逐次调用的成本可忽略；
 * 而模块级节流会引入跨请求的隐藏状态，让测试结果依赖执行顺序。
 */
export function sweepStaleJobs(): number {
  const now = Date.now();
  const result = getDb()
    .update(studioJobs)
    .set({
      status: 'failed',
      error: JOB_INTERRUPTED_MESSAGE,
      updatedAt: nowIso(),
      finishedAt: nowIso(),
    })
    .where(
      and(
        eq(studioJobs.status, 'running'),
        lt(studioJobs.updatedAt, new Date(now - JOB_STALE_MS).toISOString()),
      ),
    )
    .run();
  return result.changes;
}

/**
 * 建作业。同一任务同一步骤已有 running 作业时**原样返回它**（幂等），
 * 使重复提交/双击不会并发跑两批。
 *
 * 必须先 sweep 再查重：进程重启后残留的僵尸 running 若无条件命中的话，
 * 会被当成「已有作业」返回，用户将永远建不出新作业。
 * better-sqlite3 是同步单连接，事务内检查与插入之间不可能插入其他请求，故无需唯一索引兜底。
 */
export function createJob(input: CreateJobInput): StudioJobCreateResult {
  const db = getDb();
  return db.transaction(() => {
    sweepStaleJobs();
    const running = db
      .select()
      .from(studioJobs)
      .where(
        and(
          eq(studioJobs.taskId, input.taskId),
          eq(studioJobs.stepKey, input.stepKey),
          eq(studioJobs.status, 'running'),
        ),
      )
      .get() as JobRow | undefined;
    if (running) return { job: toSnapshot(running), created: false };

    const id = generateId();
    const now = nowIso();
    db.insert(studioJobs)
      .values({
        id,
        product: input.product,
        taskId: input.taskId,
        stepKey: input.stepKey,
        kind: input.kind,
        status: 'running',
        data: JSON.stringify(input.data),
        createdAt: now,
        updatedAt: now,
      })
      .run();

    // 保留最近 N 条历史，避免作业行无限增长
    const stale = db
      .select({ id: studioJobs.id })
      .from(studioJobs)
      .where(eq(studioJobs.taskId, input.taskId))
      .orderBy(desc(studioJobs.createdAt), desc(sql`rowid`))
      .all()
      .slice(JOB_HISTORY_LIMIT);
    if (stale.length > 0) {
      db.delete(studioJobs)
        .where(
          inArray(
            studioJobs.id,
            stale.map((row) => row.id),
          ),
        )
        .run();
    }

    return {
      job: toSnapshot(db.select().from(studioJobs).where(eq(studioJobs.id, id)).get() as JobRow),
      created: true,
    };
  });
}

/** 读取单个作业。 */
export function getJob(jobId: string): StudioJobSnapshot | undefined {
  const row = getDb().select().from(studioJobs).where(eq(studioJobs.id, jobId)).get() as
    JobRow | undefined;
  return row ? toSnapshot(row) : undefined;
}

/**
 * 读取某任务最近的作业，新在前。
 * created_at 只到毫秒，同一毫秒建的两个作业会打平（取消后立刻重跑即会触发），
 * 故再按 rowid 倒序决胜 —— 自增 rowid 即插入顺序，保证顺序确定。
 */
export function listJobsByTask(taskId: string, limit = JOB_HISTORY_LIMIT): StudioJobSnapshot[] {
  const rows = getDb()
    .select()
    .from(studioJobs)
    .where(eq(studioJobs.taskId, taskId))
    .orderBy(desc(studioJobs.createdAt), desc(sql`rowid`))
    .all()
    .slice(0, limit) as JobRow[];
  return rows.map(toSnapshot);
}

/** 批量查询这些任务中正在运行的作业，返回 taskId → stepKey。供任务列表展示「生成中」。 */
export function listRunningJobKeys(taskIds: readonly string[]): Map<string, string> {
  if (taskIds.length === 0) return new Map();
  const rows = getDb()
    .select({ taskId: studioJobs.taskId, stepKey: studioJobs.stepKey })
    .from(studioJobs)
    .where(and(inArray(studioJobs.taskId, [...taskIds]), eq(studioJobs.status, 'running')))
    .all();
  return new Map(rows.map((row) => [row.taskId, row.stepKey]));
}

/** 该任务是否存在指定步骤的运行中作业。 */
export function hasRunningJob(taskId: string, stepKey: string): boolean {
  return Boolean(
    getDb()
      .select({ id: studioJobs.id })
      .from(studioJobs)
      .where(
        and(
          eq(studioJobs.taskId, taskId),
          eq(studioJobs.stepKey, stepKey),
          eq(studioJobs.status, 'running'),
        ),
      )
      .get(),
  );
}

/**
 * 覆盖写入作业进度。返回 false 表示该作业已非 running（被取消或被判中断），
 * 运行器据此立即停止 —— 这是「取消后立刻重跑」正确性的关键。
 */
export function updateJobData(jobId: string, data: StudioJobData): boolean {
  const result = getDb()
    .update(studioJobs)
    .set({ data: JSON.stringify(data), updatedAt: nowIso() })
    .where(and(eq(studioJobs.id, jobId), eq(studioJobs.status, 'running')))
    .run();
  return result.changes > 0;
}

/** 标记作业成功。返回 false 表示已被取消/判中断（此时不应再覆盖终态）。 */
export function finishJob(jobId: string, data: StudioJobData): boolean {
  const result = getDb()
    .update(studioJobs)
    .set({
      status: 'succeeded',
      data: JSON.stringify(data),
      updatedAt: nowIso(),
      finishedAt: nowIso(),
    })
    .where(and(eq(studioJobs.id, jobId), eq(studioJobs.status, 'running')))
    .run();
  return result.changes > 0;
}

/** 标记作业失败；可选保留已完成的进度（部分结果不丢）。 */
export function failJob(jobId: string, error: string, data?: StudioJobData): boolean {
  const result = getDb()
    .update(studioJobs)
    .set({
      status: 'failed',
      error,
      ...(data ? { data: JSON.stringify(data) } : {}),
      updatedAt: nowIso(),
      finishedAt: nowIso(),
    })
    .where(and(eq(studioJobs.id, jobId), eq(studioJobs.status, 'running')))
    .run();
  return result.changes > 0;
}

/**
 * 请求取消。仅能把 running 置为 cancelled，返回 false 表示作业已结束。
 * 调用方应同时中止进程内运行器，避免等它跑到下一张图才停。
 */
export function requestCancelJob(jobId: string): boolean {
  const result = getDb()
    .update(studioJobs)
    .set({ status: 'cancelled', updatedAt: nowIso(), finishedAt: nowIso() })
    .where(and(eq(studioJobs.id, jobId), eq(studioJobs.status, 'running')))
    .run();
  return result.changes > 0;
}

/** 作业是否仍处于 running —— 运行器每张图之间用它判断是否已被外部取消。 */
export function isJobRunning(jobId: string): boolean {
  const row = getDb()
    .select({ status: studioJobs.status })
    .from(studioJobs)
    .where(eq(studioJobs.id, jobId))
    .get();
  return row?.status === 'running';
}

/** 删除某任务的全部作业行。任务被删时须先调它，否则留下孤儿作业。 */
export function deleteJobsByTask(taskId: string): void {
  getDb().delete(studioJobs).where(eq(studioJobs.taskId, taskId)).run();
}
