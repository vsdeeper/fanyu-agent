import 'server-only';

import { z } from 'zod';
import { imageTextTaskAssets, imageTextTaskSteps, imageTextTasks } from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import { IMAGE_TEXT_STEP_KEYS, IMAGE_TEXT_WORKFLOW_VERSION } from '../_shared/task-constants';
import type { CreateImageTextTaskRequest, ImageTextStepKey } from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: imageTextTaskAssets,
  diskSegment: 'image-text',
  apiPrefix: '/api/studio/image-text',
});

const store = createTaskStore<ImageTextStepKey>({
  tasksTable: imageTextTasks,
  stepsTable: imageTextTaskSteps,
  stepKeys: IMAGE_TEXT_STEP_KEYS,
  workflowVersion: IMAGE_TEXT_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<ImageTextStepKey, CreateImageTextTaskRequest>({
  stepKeys: IMAGE_TEXT_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'image-text-tasks',
  notFoundMessage: '图文任务不存在',
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

export const loadImageTextTask = store.load;

export const handleListImageTextTasks = handlers.handleListTasks;
export const handleCreateImageTextTask = handlers.handleCreateTask;
export const handleGetImageTextTask = handlers.handleGetTask;
export const handleUpdateImageTextTask = handlers.handleUpdateTask;
export const handleDeleteImageTextTask = handlers.handleDeleteTask;
export const handleSaveImageTextTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteImageTextTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定图文任务资产。 */
export function serveImageTextTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'image-text-assets',
  });
}
