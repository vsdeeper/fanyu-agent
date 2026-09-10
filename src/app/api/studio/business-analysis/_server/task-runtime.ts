import 'server-only';

import { z } from 'zod';
import {
  businessAnalysisTaskAssets,
  businessAnalysisTaskSteps,
  businessAnalysisTasks,
} from '@/lib/db/schema';
import { createTaskAssets } from '@/app/api/studio/_server/create-task-assets';
import { createTaskHandlers } from '@/app/api/studio/_server/create-task-handlers';
import { createTaskParseRequest } from '@/app/api/studio/_server/create-task-parse-request';
import { createTaskStore } from '@/app/api/studio/_server/create-task-store';
import { serveTaskAsset } from '@/app/api/studio/_server/serve-task-asset';
import {
  BUSINESS_ANALYSIS_STEP_KEYS,
  BUSINESS_ANALYSIS_WORKFLOW_VERSION,
} from '../_shared/task-constants';
import type {
  BusinessAnalysisStepKey,
  CreateBusinessAnalysisTaskRequest,
} from '../_shared/task-types';

const assets = createTaskAssets({
  assetsTable: businessAnalysisTaskAssets,
  diskSegment: 'business-analysis',
  apiPrefix: '/api/studio/business-analysis',
});

const store = createTaskStore<BusinessAnalysisStepKey>({
  tasksTable: businessAnalysisTasks,
  stepsTable: businessAnalysisTaskSteps,
  stepKeys: BUSINESS_ANALYSIS_STEP_KEYS,
  workflowVersion: BUSINESS_ANALYSIS_WORKFLOW_VERSION,
  removeTaskAssetDirectory: assets.removeTaskAssetDirectory,
});

const parse = createTaskParseRequest<BusinessAnalysisStepKey, CreateBusinessAnalysisTaskRequest>({
  stepKeys: BUSINESS_ANALYSIS_STEP_KEYS,
  createSchema: z.strictObject({
    name: z.string().trim().min(1).max(100),
  }),
});

const handlers = createTaskHandlers({
  logTag: 'business-analysis-tasks',
  notFoundMessage: '商业分析任务不存在',
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

export const loadBusinessAnalysisTask = store.load;
export const createBusinessAnalysisTask = store.create;
export const listBusinessAnalysisTasks = store.list;
export const hasBusinessAnalysisTaskName = store.hasName;
export const businessAnalysisTaskExists = store.exists;
export const updateBusinessAnalysisTaskName = store.updateName;
export const saveBusinessAnalysisTaskStep = store.saveStep;
export const deleteBusinessAnalysisTaskStep = store.deleteStep;
export const deleteBusinessAnalysisTask = store.remove;

export const {
  parseCreateTaskRequest,
  parseUpdateTaskRequest,
  parseSaveStepRequest,
  parseTaskListQuery,
} = parse;

export const parseBusinessAnalysisStepKey = parse.parseStepKey;

export const handleListBusinessAnalysisTasks = handlers.handleListTasks;
export const handleCreateBusinessAnalysisTask = handlers.handleCreateTask;
export const handleGetBusinessAnalysisTask = handlers.handleGetTask;
export const handleUpdateBusinessAnalysisTask = handlers.handleUpdateTask;
export const handleDeleteBusinessAnalysisTask = handlers.handleDeleteTask;
export const handleSaveBusinessAnalysisTaskStep = handlers.handleSaveTaskStep;
export const handleDeleteBusinessAnalysisTaskStep = handlers.handleDeleteTaskStep;

/** 返回指定商业分析任务资产。 */
export function serveBusinessAnalysisTaskAsset(taskId: string, assetId: string): Response {
  return serveTaskAsset({
    taskId,
    assetId,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    logTag: 'business-analysis-assets',
  });
}
