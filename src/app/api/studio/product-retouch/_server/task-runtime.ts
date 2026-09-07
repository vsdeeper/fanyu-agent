import 'server-only';

import { z } from 'zod';
import {
  productRetouchTaskAssets,
  productRetouchTaskSteps,
  productRetouchTasks,
} from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import {
  PRODUCT_RETOUCH_STEP_KEYS,
  PRODUCT_RETOUCH_WORKFLOW_VERSION,
} from '../_shared/task-constants';
import type { CreateProductRetouchTaskRequest, ProductRetouchStepKey } from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: productRetouchTaskAssets,
  diskSegment: 'product-retouch',
  apiPrefix: '/api/studio/product-retouch',
});

const store = createTaskStore<ProductRetouchStepKey>({
  tasksTable: productRetouchTasks,
  stepsTable: productRetouchTaskSteps,
  stepKeys: PRODUCT_RETOUCH_STEP_KEYS,
  workflowVersion: PRODUCT_RETOUCH_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<ProductRetouchStepKey, CreateProductRetouchTaskRequest>({
  stepKeys: PRODUCT_RETOUCH_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'product-retouch-tasks',
  notFoundMessage: '产品精修任务不存在',
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

export const { persistSnapshotAssets, getTaskAsset, readTaskAsset } = assets;

export const loadProductRetouchTask = store.load;
export const createProductRetouchTask = store.create;
export const listProductRetouchTasks = store.list;
export const hasProductRetouchTaskName = store.hasName;
export const productRetouchTaskExists = store.exists;
export const updateProductRetouchTaskName = store.updateName;
export const saveProductRetouchTaskStep = store.saveStep;
export const deleteProductRetouchTaskStep = store.deleteStep;
export const deleteProductRetouchTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseProductRetouchStepKey = parse.parseStepKey;

export const handleListProductRetouchTasks = handlers.handleListTasks;
export const handleCreateProductRetouchTask = handlers.handleCreateTask;
export const handleGetProductRetouchTask = handlers.handleGetTask;
export const handleUpdateProductRetouchTask = handlers.handleUpdateTask;
export const handleDeleteProductRetouchTask = handlers.handleDeleteTask;
export const handleSaveProductRetouchTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteProductRetouchTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定产品精修任务资产。 */
export function serveProductRetouchTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    readTaskAsset,
    logTag: 'product-retouch-assets',
  });
}
