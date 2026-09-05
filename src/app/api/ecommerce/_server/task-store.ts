import 'server-only';

import { generateId } from 'ai';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { ecommerceTaskSteps, ecommerceTasks } from '@/lib/db/schema';
import { ECOMMERCE_STEP_KEYS, ECOMMERCE_WORKFLOW_VERSION } from '../_shared/task-constants';
import type {
  EcommerceStepKey,
  EcommerceTaskDetail,
  EcommerceTaskListData,
  EcommerceTaskListItem,
  EcommerceTaskType,
} from '../_shared/task-types';
import { removeTaskAssetDirectory } from './task-assets';

function isStepKey(value: string): value is EcommerceStepKey {
  return ECOMMERCE_STEP_KEYS.includes(value as EcommerceStepKey);
}

/** 创建电商设计任务并返回任务 id。 */
export function createEcommerceTask(name: string, taskType: EcommerceTaskType): string {
  const id = generateId();
  const now = new Date().toISOString();
  getDb()
    .insert(ecommerceTasks)
    .values({
      id,
      name,
      taskType,
      workflowVersion: ECOMMERCE_WORKFLOW_VERSION,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

/** 按名称过滤并分页读取电商设计任务。 */
export function listEcommerceTasks({
  name,
  page,
  pageSize,
}: {
  name?: string;
  page: number;
  pageSize: number;
}): EcommerceTaskListData {
  const db = getDb();
  const allTasks = db.select().from(ecommerceTasks).orderBy(desc(ecommerceTasks.updatedAt)).all();
  const normalizedName = name?.trim().toLocaleLowerCase();
  const filtered = normalizedName
    ? allTasks.filter((task) => task.name.toLocaleLowerCase().includes(normalizedName))
    : allTasks;
  const completedByTask = new Map<string, EcommerceStepKey[]>();
  db.select({
    taskId: ecommerceTaskSteps.taskId,
    stepKey: ecommerceTaskSteps.stepKey,
  })
    .from(ecommerceTaskSteps)
    .all()
    .forEach((step) => {
      if (!isStepKey(step.stepKey)) return;
      const keys = completedByTask.get(step.taskId) ?? [];
      keys.push(step.stepKey);
      completedByTask.set(step.taskId, keys);
    });

  const start = (page - 1) * pageSize;
  const items: EcommerceTaskListItem[] = filtered.slice(start, start + pageSize).map((task) => ({
    id: task.id,
    name: task.name,
    taskType: task.taskType as EcommerceTaskType,
    workflowVersion: task.workflowVersion,
    completedStepKeys: [...(completedByTask.get(task.id) ?? [])].sort(
      (a, b) => ECOMMERCE_STEP_KEYS.indexOf(a) - ECOMMERCE_STEP_KEYS.indexOf(b),
    ),
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  }));
  return { items, total: filtered.length, page, pageSize };
}

/** 读取任务基础信息及所有可识别的步骤快照。 */
export function loadEcommerceTask(id: string): EcommerceTaskDetail | undefined {
  const db = getDb();
  const task = db.select().from(ecommerceTasks).where(eq(ecommerceTasks.id, id)).get();
  if (!task) return undefined;
  const steps = db.select().from(ecommerceTaskSteps).where(eq(ecommerceTaskSteps.taskId, id)).all();
  const detailSteps: EcommerceTaskDetail['steps'] = {};
  steps.forEach((step) => {
    if (!isStepKey(step.stepKey)) return;
    detailSteps[step.stepKey] = {
      stepKey: step.stepKey,
      snapshotVersion: step.snapshotVersion,
      data: JSON.parse(step.data) as unknown,
      updatedAt: step.updatedAt,
    };
  });
  return {
    id: task.id,
    name: task.name,
    taskType: task.taskType as EcommerceTaskType,
    workflowVersion: task.workflowVersion,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    steps: detailSteps,
  };
}

/** 判断电商设计任务是否存在。 */
export function ecommerceTaskExists(id: string): boolean {
  return Boolean(
    getDb()
      .select({ id: ecommerceTasks.id })
      .from(ecommerceTasks)
      .where(eq(ecommerceTasks.id, id))
      .get(),
  );
}

/** 仅更新任务名称，任务类型创建后保持不变。 */
export function updateEcommerceTaskName(id: string, name: string): boolean {
  const result = getDb()
    .update(ecommerceTasks)
    .set({ name, updatedAt: new Date().toISOString() })
    .where(eq(ecommerceTasks.id, id))
    .run();
  return result.changes > 0;
}

/** 覆盖单一步骤快照，并刷新任务更新时间。 */
export function saveEcommerceTaskStep({
  taskId,
  stepKey,
  snapshotVersion,
  data,
}: {
  taskId: string;
  stepKey: EcommerceStepKey;
  snapshotVersion: number;
  data: unknown;
}): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.insert(ecommerceTaskSteps)
      .values({
        taskId,
        stepKey,
        snapshotVersion,
        data: JSON.stringify(data),
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [ecommerceTaskSteps.taskId, ecommerceTaskSteps.stepKey],
        set: {
          snapshotVersion,
          data: JSON.stringify(data),
          updatedAt: now,
        },
      })
      .run();
    tx.update(ecommerceTasks).set({ updatedAt: now }).where(eq(ecommerceTasks.id, taskId)).run();
  });
}

/** 删除单一步骤快照，用于上游重新生成后使下游历史结果失效。 */
export function deleteEcommerceTaskStep(taskId: string, stepKey: EcommerceStepKey): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.delete(ecommerceTaskSteps)
      .where(and(eq(ecommerceTaskSteps.taskId, taskId), eq(ecommerceTaskSteps.stepKey, stepKey)))
      .run();
    tx.update(ecommerceTasks).set({ updatedAt: now }).where(eq(ecommerceTasks.id, taskId)).run();
  });
}

/** 删除任务数据库记录及其磁盘资产。 */
export function deleteEcommerceTask(id: string): boolean {
  const result = getDb().delete(ecommerceTasks).where(eq(ecommerceTasks.id, id)).run();
  if (result.changes > 0) removeTaskAssetDirectory(id);
  return result.changes > 0;
}
