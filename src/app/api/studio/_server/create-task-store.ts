import 'server-only';

import { generateId } from 'ai';
import { and, desc, eq } from 'drizzle-orm';
import {
  businessAnalysisTaskSteps,
  businessAnalysisTasks,
  ecommerceTaskSteps,
  ecommerceTasks,
  productModelTaskSteps,
  productModelTasks,
  productRetouchTaskSteps,
  productRetouchTasks,
} from '@/lib/db/schema';
import { getDb } from '@/lib/db/client';
import { rewriteLegacyStudioAssetUrls } from './rewrite-legacy-asset-urls';
import type {
  StudioTaskDetail,
  StudioTaskListData,
  StudioTaskListItem,
  StudioTaskStepRecord,
} from '../_shared/task-types';

export type StudioTasksTable =
  | typeof ecommerceTasks
  | typeof productModelTasks
  | typeof productRetouchTasks
  | typeof businessAnalysisTasks;

export type StudioStepsTable =
  | typeof ecommerceTaskSteps
  | typeof productModelTaskSteps
  | typeof productRetouchTaskSteps
  | typeof businessAnalysisTaskSteps;

type TaskRow = {
  id: string;
  name: string;
  workflowVersion: number;
  createdAt: string;
  updatedAt: string;
  taskType?: string;
};

export type CreateStudioTaskStoreConfig<TStepKey extends string, TExtra extends object = object> = {
  tasksTable: StudioTasksTable;
  stepsTable: StudioStepsTable;
  stepKeys: readonly TStepKey[];
  workflowVersion: number;
  extraCreateValues?: (extra: TExtra) => Record<string, unknown>;
  mapExtraFields?: (row: TaskRow) => TExtra;
  removeTaskAssetDirectory: (taskId: string) => void;
  /**
   * 可选：批量查询这些任务中正在后台生成的步骤，返回 taskId → stepKey。
   * 不注入时列表行为完全不变，故未接后台作业的产品无需改动。
   */
  listRunningJobKeys?: (taskIds: readonly string[]) => Map<string, string>;
};

/**
 * 创建工作室任务 DAL：CRUD、步骤快照、名称冲突。表与 stepKeys 由调用方注入。
 */
export function createTaskStore<TStepKey extends string, TExtra extends object = object>(
  config: CreateStudioTaskStoreConfig<TStepKey, TExtra>,
) {
  const { tasksTable, stepsTable } = config;

  function isStepKey(value: string): value is TStepKey {
    return (config.stepKeys as readonly string[]).includes(value);
  }

  function extraFields(row: TaskRow): TExtra {
    return config.mapExtraFields ? config.mapExtraFields(row) : ({} as TExtra);
  }

  /** 创建任务并返回 id。 */
  function create(name: string, extra?: TExtra): string {
    const id = generateId();
    const now = new Date().toISOString();
    getDb()
      .insert(tasksTable)
      .values({
        id,
        name,
        workflowVersion: config.workflowVersion,
        createdAt: now,
        updatedAt: now,
        ...(extra && config.extraCreateValues ? config.extraCreateValues(extra) : {}),
      } as never)
      .run();
    return id;
  }

  /** 按名称过滤并分页读取任务。 */
  function list({
    name,
    page,
    pageSize,
  }: {
    name?: string;
    page: number;
    pageSize: number;
  }): StudioTaskListData<StudioTaskListItem<TStepKey, TExtra>> {
    const db = getDb();
    const ordered = db
      .select()
      .from(tasksTable)
      .orderBy(desc(tasksTable.updatedAt))
      .all() as TaskRow[];
    const normalizedName = name?.trim().toLocaleLowerCase();
    const filtered = normalizedName
      ? ordered.filter((task) => task.name.toLocaleLowerCase().includes(normalizedName))
      : ordered;
    const completedByTask = new Map<string, TStepKey[]>();
    db.select({
      taskId: stepsTable.taskId,
      stepKey: stepsTable.stepKey,
    })
      .from(stepsTable)
      .all()
      .forEach((step) => {
        if (!isStepKey(step.stepKey)) return;
        const keys = completedByTask.get(step.taskId) ?? [];
        keys.push(step.stepKey);
        completedByTask.set(step.taskId, keys);
      });

    const start = (page - 1) * pageSize;
    const pageTasks = filtered.slice(start, start + pageSize);
    const runningByTask = config.listRunningJobKeys?.(pageTasks.map((task) => task.id));
    const items: StudioTaskListItem<TStepKey, TExtra>[] = pageTasks.map((task) => {
      const runningStepKey = runningByTask?.get(task.id);
      return {
        id: task.id,
        name: task.name,
        workflowVersion: task.workflowVersion,
        completedStepKeys: [...(completedByTask.get(task.id) ?? [])].sort(
          (a, b) => config.stepKeys.indexOf(a) - config.stepKeys.indexOf(b),
        ),
        ...(runningStepKey && isStepKey(runningStepKey) ? { runningStepKey } : {}),
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        ...extraFields(task),
      };
    });
    return { items, total: filtered.length, page, pageSize };
  }

  /** 读取任务基础信息及所有可识别的步骤快照。 */
  function load(id: string): StudioTaskDetail<TStepKey, TExtra> | undefined {
    const db = getDb();
    const task = db.select().from(tasksTable).where(eq(tasksTable.id, id)).get() as
      TaskRow | undefined;
    if (!task) return undefined;
    const steps = db.select().from(stepsTable).where(eq(stepsTable.taskId, id)).all();
    // 局部用干净类型收集，末尾整体断言：StudioTaskDetail 与泛型 TExtra 交叉后，
    // steps 会被推导为 `TExtra['steps'] & Partial<...>` 的延迟索引，直接赋值必然报错。
    const detailSteps: Partial<Record<TStepKey, StudioTaskStepRecord<TStepKey>>> = {};
    steps.forEach((step) => {
      if (!isStepKey(step.stepKey)) return;
      detailSteps[step.stepKey] = {
        stepKey: step.stepKey,
        snapshotVersion: step.snapshotVersion,
        // 历史快照可能仍含旧 /api/{product}/ URL；读出时改写以免前端 404。
        data: rewriteLegacyStudioAssetUrls(JSON.parse(step.data)),
        updatedAt: step.updatedAt,
      };
    });
    return {
      id: task.id,
      name: task.name,
      workflowVersion: task.workflowVersion,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      ...extraFields(task),
      steps: detailSteps,
    } as StudioTaskDetail<TStepKey, TExtra>;
  }

  /** 同产品线内是否已有同名任务；excludeId 用于改名时排除自身。 */
  function hasName(name: string, excludeId?: string): boolean {
    const rows = getDb()
      .select({ id: tasksTable.id })
      .from(tasksTable)
      .where(eq(tasksTable.name, name))
      .all();
    return rows.some((row) => row.id !== excludeId);
  }

  /** 判断任务是否存在。 */
  function exists(id: string): boolean {
    return Boolean(
      getDb().select({ id: tasksTable.id }).from(tasksTable).where(eq(tasksTable.id, id)).get(),
    );
  }

  /** 仅更新任务名称。 */
  function updateName(id: string, name: string): boolean {
    const result = getDb()
      .update(tasksTable)
      .set({ name, updatedAt: new Date().toISOString() })
      .where(eq(tasksTable.id, id))
      .run();
    return result.changes > 0;
  }

  /** 覆盖单一步骤快照，并刷新任务更新时间。 */
  function saveStep({
    taskId,
    stepKey,
    snapshotVersion,
    data,
  }: {
    taskId: string;
    stepKey: TStepKey;
    snapshotVersion: number;
    data: unknown;
  }): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.transaction((tx) => {
      tx.insert(stepsTable)
        .values({
          taskId,
          stepKey,
          snapshotVersion,
          data: JSON.stringify(data),
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [stepsTable.taskId, stepsTable.stepKey],
          set: {
            snapshotVersion,
            data: JSON.stringify(data),
            updatedAt: now,
          },
        })
        .run();
      tx.update(tasksTable).set({ updatedAt: now }).where(eq(tasksTable.id, taskId)).run();
    });
  }

  /** 删除单一步骤快照。 */
  function deleteStep(taskId: string, stepKey: TStepKey): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.transaction((tx) => {
      tx.delete(stepsTable)
        .where(and(eq(stepsTable.taskId, taskId), eq(stepsTable.stepKey, stepKey)))
        .run();
      tx.update(tasksTable).set({ updatedAt: now }).where(eq(tasksTable.id, taskId)).run();
    });
  }

  /** 删除任务数据库记录及其磁盘资产。 */
  function remove(id: string): boolean {
    const result = getDb().delete(tasksTable).where(eq(tasksTable.id, id)).run();
    if (result.changes > 0) config.removeTaskAssetDirectory(id);
    return result.changes > 0;
  }

  return { create, list, load, hasName, exists, updateName, saveStep, deleteStep, remove };
}
