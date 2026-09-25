import 'server-only';

import { z } from 'zod';
import { longArticleTaskAssets, longArticleTaskSteps, longArticleTasks } from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import { LONG_ARTICLE_STEP_KEYS, LONG_ARTICLE_WORKFLOW_VERSION } from '../_shared/task-constants';
import type { CreateLongArticleTaskRequest, LongArticleStepKey } from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: longArticleTaskAssets,
  diskSegment: 'long-article',
  apiPrefix: '/api/studio/long-article',
});

const store = createTaskStore<LongArticleStepKey>({
  tasksTable: longArticleTasks,
  stepsTable: longArticleTaskSteps,
  stepKeys: LONG_ARTICLE_STEP_KEYS,
  workflowVersion: LONG_ARTICLE_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<LongArticleStepKey, CreateLongArticleTaskRequest>({
  stepKeys: LONG_ARTICLE_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'long-article-tasks',
  notFoundMessage: '长文任务不存在',
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

export const loadLongArticleTask = store.load;
export const createLongArticleTask = store.create;
export const listLongArticleTasks = store.list;
export const hasLongArticleTaskName = store.hasName;
export const longArticleTaskExists = store.exists;
export const updateLongArticleTaskName = store.updateName;
export const saveLongArticleTaskStep = store.saveStep;
export const deleteLongArticleTaskStep = store.deleteStep;
export const deleteLongArticleTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseLongArticleStepKey = parse.parseStepKey;

export const handleListLongArticleTasks = handlers.handleListTasks;
export const handleCreateLongArticleTask = handlers.handleCreateTask;
export const handleGetLongArticleTask = handlers.handleGetTask;
export const handleUpdateLongArticleTask = handlers.handleUpdateTask;
export const handleDeleteLongArticleTask = handlers.handleDeleteTask;
export const handleSaveLongArticleTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteLongArticleTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定长文任务资产。 */
export function serveLongArticleTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'long-article-assets',
  });
}
