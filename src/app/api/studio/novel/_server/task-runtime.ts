import 'server-only';

import { z } from 'zod';
import { novelTaskAssets, novelTaskSteps, novelTasks } from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import { NOVEL_STEP_KEYS, NOVEL_WORKFLOW_VERSION } from '../_shared/task-constants';
import type { CreateNovelTaskRequest, NovelStepKey, NovelTaskDetail } from '../_shared/task-types';
import {
  mergeLegacyNovelDetail,
  readAllNovelStepRows,
  readNovelStepRows,
  withLegacyListKeys,
} from './legacy-snapshot';

const assets = createTaskAssets({
  assetsTable: novelTaskAssets,
  diskSegment: 'novel',
  apiPrefix: '/api/studio/novel',
});

const store = createTaskStore<NovelStepKey>({
  tasksTable: novelTasks,
  stepsTable: novelTaskSteps,
  stepKeys: NOVEL_STEP_KEYS,
  workflowVersion: NOVEL_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<NovelStepKey, CreateNovelTaskRequest>({
  stepKeys: NOVEL_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

/** 读取任务，并把旧的设定/结构步骤映射到角色、方案与卷章。 */
function loadNovelTask(id: string): NovelTaskDetail | undefined {
  const detail = store.load(id);
  if (!detail) return undefined;
  return mergeLegacyNovelDetail(detail, readNovelStepRows(id));
}

/** 列表里的旧步骤键显示为当前步骤名。 */
function listNovelTasks(query: Parameters<typeof store.list>[0]): ReturnType<typeof store.list> {
  return withLegacyListKeys(store.list(query), readAllNovelStepRows());
}

const handlers = createTaskHandlers({
  logTag: 'novel-tasks',
  notFoundMessage: '小说任务不存在',
  createInvalidMessage: '任务名称无效',
  ...parse,
  create: (name) => store.create(name),
  list: listNovelTasks,
  load: loadNovelTask,
  hasName: store.hasName,
  exists: store.exists,
  updateName: store.updateName,
  saveStep: store.saveStep,
  deleteStep: store.deleteStep,
  remove: store.remove,
  persistSnapshotAssets: assets.persistSnapshotAssets,
});

export const { persistSnapshotAssets, getTaskAsset, findAssetTaskId, readTaskAsset } = assets;

export { loadNovelTask };
export const createNovelTask = store.create;
export { listNovelTasks };
export const hasNovelTaskName = store.hasName;
export const novelTaskExists = store.exists;
export const updateNovelTaskName = store.updateName;
export const saveNovelTaskStep = store.saveStep;
export const deleteNovelTaskStep = store.deleteStep;
export const deleteNovelTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseNovelStepKey = parse.parseStepKey;

export const handleListNovelTasks = handlers.handleListTasks;
export const handleCreateNovelTask = handlers.handleCreateTask;
export const handleGetNovelTask = handlers.handleGetTask;
export const handleUpdateNovelTask = handlers.handleUpdateTask;
export const handleDeleteNovelTask = handlers.handleDeleteTask;
export const handleSaveNovelTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteNovelTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定小说任务资产。 */
export function serveNovelTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'novel-assets',
  });
}
