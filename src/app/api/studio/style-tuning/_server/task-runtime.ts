import 'server-only';

import { z } from 'zod';
import { styleTuningTaskAssets, styleTuningTaskSteps, styleTuningTasks } from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import { STYLE_TUNING_STEP_KEYS, STYLE_TUNING_WORKFLOW_VERSION } from '../_shared/task-constants';
import type { CreateStyleTuningTaskRequest, StyleTuningStepKey } from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: styleTuningTaskAssets,
  diskSegment: 'style-tuning',
  apiPrefix: '/api/studio/style-tuning',
});

const store = createTaskStore<StyleTuningStepKey>({
  tasksTable: styleTuningTasks,
  stepsTable: styleTuningTaskSteps,
  stepKeys: STYLE_TUNING_STEP_KEYS,
  workflowVersion: STYLE_TUNING_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<StyleTuningStepKey, CreateStyleTuningTaskRequest>({
  stepKeys: STYLE_TUNING_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'style-tuning-tasks',
  notFoundMessage: '文风调任务不存在',
  createInvalidMessage: '任务名称无效',
  ...parse,
  create: (name) => store.create(name),
  list: store.list,
  load: store.load,
  hasName: store.hasName,
  exists: store.exists,
  updateName: store.updateName,
  saveStep: store.saveStep,
  deleteStep: store.deleteStep,
  remove: store.remove,
  persistSnapshotAssets: assets.persistSnapshotAssets,
});

export const { persistSnapshotAssets, getTaskAsset, findAssetTaskId, readTaskAsset } = assets;

export const loadStyleTuningTask = store.load;
export const createStyleTuningTask = store.create;
export const listStyleTuningTasks = store.list;
export const hasStyleTuningTaskName = store.hasName;
export const styleTuningTaskExists = store.exists;
export const updateStyleTuningTaskName = store.updateName;
export const saveStyleTuningTaskStep = store.saveStep;
export const deleteStyleTuningTaskStep = store.deleteStep;
export const deleteStyleTuningTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseStyleTuningStepKey = parse.parseStepKey;

export const handleListStyleTuningTasks = handlers.handleListTasks;
export const handleCreateStyleTuningTask = handlers.handleCreateTask;
export const handleGetStyleTuningTask = handlers.handleGetTask;
export const handleUpdateStyleTuningTask = handlers.handleUpdateTask;
export const handleDeleteStyleTuningTask = handlers.handleDeleteTask;
export const handleSaveStyleTuningTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteStyleTuningTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定文风调任务资产。 */
export function serveStyleTuningTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'style-tuning-assets',
  });
}
