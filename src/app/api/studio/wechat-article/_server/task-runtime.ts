import 'server-only';

import { z } from 'zod';
import {
  wechatArticleTaskAssets,
  wechatArticleTaskSteps,
  wechatArticleTasks,
} from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import {
  WECHAT_ARTICLE_STEP_KEYS,
  WECHAT_ARTICLE_WORKFLOW_VERSION,
} from '../_shared/task-constants';
import type { CreateWechatArticleTaskRequest, WechatArticleStepKey } from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: wechatArticleTaskAssets,
  diskSegment: 'wechat-article',
  apiPrefix: '/api/studio/wechat-article',
});

const store = createTaskStore<WechatArticleStepKey>({
  tasksTable: wechatArticleTasks,
  stepsTable: wechatArticleTaskSteps,
  stepKeys: WECHAT_ARTICLE_STEP_KEYS,
  workflowVersion: WECHAT_ARTICLE_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<WechatArticleStepKey, CreateWechatArticleTaskRequest>({
  stepKeys: WECHAT_ARTICLE_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'wechat-article-tasks',
  notFoundMessage: '公众号任务不存在',
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

export const loadWechatArticleTask = store.load;
export const createWechatArticleTask = store.create;
export const listWechatArticleTasks = store.list;
export const hasWechatArticleTaskName = store.hasName;
export const wechatArticleTaskExists = store.exists;
export const updateWechatArticleTaskName = store.updateName;
export const saveWechatArticleTaskStep = store.saveStep;
export const deleteWechatArticleTaskStep = store.deleteStep;
export const deleteWechatArticleTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseWechatArticleStepKey = parse.parseStepKey;

export const handleListWechatArticleTasks = handlers.handleListTasks;
export const handleCreateWechatArticleTask = handlers.handleCreateTask;
export const handleGetWechatArticleTask = handlers.handleGetTask;
export const handleUpdateWechatArticleTask = handlers.handleUpdateTask;
export const handleDeleteWechatArticleTask = handlers.handleDeleteTask;
export const handleSaveWechatArticleTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteWechatArticleTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定公众号任务资产。 */
export function serveWechatArticleTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'wechat-article-assets',
  });
}
