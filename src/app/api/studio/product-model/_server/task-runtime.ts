import 'server-only';

import { z } from 'zod';
import { productModelTaskAssets, productModelTaskSteps, productModelTasks } from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import { PRODUCT_MODEL_STEP_KEYS, PRODUCT_MODEL_WORKFLOW_VERSION } from '../_shared/task-constants';
import type { CreateProductModelTaskRequest, ProductModelStepKey } from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: productModelTaskAssets,
  diskSegment: 'product-model',
  apiPrefix: '/api/studio/product-model',
});

const store = createTaskStore<ProductModelStepKey>({
  tasksTable: productModelTasks,
  stepsTable: productModelTaskSteps,
  stepKeys: PRODUCT_MODEL_STEP_KEYS,
  workflowVersion: PRODUCT_MODEL_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<ProductModelStepKey, CreateProductModelTaskRequest>({
  stepKeys: PRODUCT_MODEL_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'product-model-tasks',
  notFoundMessage: '产品模特任务不存在',
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

export const loadProductModelTask = store.load;
export const createProductModelTask = store.create;
export const listProductModelTasks = store.list;
export const hasProductModelTaskName = store.hasName;
export const productModelTaskExists = store.exists;
export const updateProductModelTaskName = store.updateName;
export const saveProductModelTaskStep = store.saveStep;
export const deleteProductModelTaskStep = store.deleteStep;
export const deleteProductModelTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseProductModelStepKey = parse.parseStepKey;

export const handleListProductModelTasks = handlers.handleListTasks;
export const handleCreateProductModelTask = handlers.handleCreateTask;
export const handleGetProductModelTask = handlers.handleGetTask;
export const handleUpdateProductModelTask = handlers.handleUpdateTask;
export const handleDeleteProductModelTask = handlers.handleDeleteTask;
export const handleSaveProductModelTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteProductModelTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定产品模特任务资产。 */
export function serveProductModelTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'product-model-assets',
  });
}
