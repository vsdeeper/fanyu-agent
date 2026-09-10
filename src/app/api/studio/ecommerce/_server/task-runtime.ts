import 'server-only';

import { z } from 'zod';
import { ecommerceTaskAssets, ecommerceTaskSteps, ecommerceTasks } from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import {
  deleteJobsByTask,
  listRunningJobKeys as findRunningJobKeys,
} from '@/app/api/studio/_server/job-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import {
  ECOMMERCE_STEP_KEYS,
  ECOMMERCE_TASK_TYPES,
  ECOMMERCE_WORKFLOW_VERSION,
} from '../_shared/task-constants';
import type {
  CreateEcommerceTaskRequest,
  EcommerceStepKey,
  EcommerceTaskType,
} from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: ecommerceTaskAssets,
  diskSegment: 'ecommerce',
  apiPrefix: '/api/studio/ecommerce',
});

const store = createTaskStore<EcommerceStepKey, { taskType: EcommerceTaskType }>({
  tasksTable: ecommerceTasks,
  stepsTable: ecommerceTaskSteps,
  stepKeys: ECOMMERCE_STEP_KEYS,
  workflowVersion: ECOMMERCE_WORKFLOW_VERSION,
  extraCreateValues: (extra) => ({ taskType: extra.taskType }),
  mapExtraFields: (row) => ({ taskType: row.taskType as EcommerceTaskType }),
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
  // 列表据此展示「生成中」
  listRunningJobKeys: findRunningJobKeys,
});

const parse = createTaskParseRequest<EcommerceStepKey, CreateEcommerceTaskRequest>({
  stepKeys: ECOMMERCE_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
    taskType: z.enum(ECOMMERCE_TASK_TYPES),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'ecommerce-tasks',
  notFoundMessage: '电商设计任务不存在',
  createInvalidMessage: '任务名称或任务类型无效',
  ...parse,
  create: (name, extra) => store.create(name, extra),
  list: store.list,
  load: store.load,
  hasName: store.hasName,
  exists: store.exists,
  updateName: store.updateName,
  saveStep: store.saveStep,
  deleteStep: store.deleteStep,
  // studio_jobs 不建外键（多态引用四张任务表），须显式清掉该任务的作业行，否则留下孤儿
  remove: (id) => {
    deleteJobsByTask(id);
    return store.remove(id);
  },
  persistSnapshotAssets: assets.persistSnapshotAssets,
});

export const {
  persistSnapshotAssets,
  saveTaskAsset,
  getTaskAsset,
  findAssetTaskId,
  readTaskAsset,
  removeTaskAssetDirectory,
} = assets;

export const loadEcommerceTask = store.load;
export const createEcommerceTask = store.create;
export const listEcommerceTasks = store.list;
export const hasEcommerceTaskName = store.hasName;
export const ecommerceTaskExists = store.exists;
export const updateEcommerceTaskName = store.updateName;
export const saveEcommerceTaskStep = store.saveStep;
export const deleteEcommerceTaskStep = store.deleteStep;
export const deleteEcommerceTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseEcommerceStepKey = parse.parseStepKey;

export const handleListEcommerceTasks = handlers.handleListTasks;
export const handleCreateEcommerceTask = handlers.handleCreateTask;
export const handleGetEcommerceTask = handlers.handleGetTask;
export const handleUpdateEcommerceTask = handlers.handleUpdateTask;
export const handleDeleteEcommerceTask = handlers.handleDeleteTask;
export const handleSaveEcommerceTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteEcommerceTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定电商任务资产。 */
export function serveEcommerceTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'ecommerce-assets',
  });
}
