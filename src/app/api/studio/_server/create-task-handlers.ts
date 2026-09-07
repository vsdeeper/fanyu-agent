import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { TASK_NAME_CONFLICT_MESSAGE } from '../_shared/task-constants';
import type {
  SaveStudioTaskStepRequest,
  StudioTaskDetail,
  StudioTaskListData,
  UpdateStudioTaskRequest,
} from '../_shared/task-types';

export type CreateStudioTaskHandlersConfig<
  TStepKey extends string,
  TCreate extends { name: string },
  TExtra extends object = object,
> = {
  logTag: string;
  notFoundMessage: string;
  createInvalidMessage: string;
  parseCreateTaskRequest: (value: unknown) => TCreate;
  parseUpdateTaskRequest: (value: unknown) => UpdateStudioTaskRequest;
  parseSaveStepRequest: (value: unknown) => SaveStudioTaskStepRequest;
  parseStepKey: (value: string) => TStepKey;
  parseTaskListQuery: (url: string) => { name?: string; page: number; pageSize: number };
  create: (name: string, extra: Omit<TCreate, 'name'>) => string;
  list: (query: { name?: string; page: number; pageSize: number }) => StudioTaskListData<unknown>;
  load: (id: string) => StudioTaskDetail<TStepKey, TExtra> | undefined;
  hasName: (name: string, excludeId?: string) => boolean;
  exists: (id: string) => boolean;
  updateName: (id: string, name: string) => boolean;
  saveStep: (input: {
    taskId: string;
    stepKey: TStepKey;
    snapshotVersion: number;
    data: unknown;
  }) => void;
  deleteStep: (taskId: string, stepKey: TStepKey) => void;
  remove: (id: string) => boolean;
  persistSnapshotAssets: (taskId: string, stepKey: TStepKey, data: unknown) => unknown;
};

/**
 * 创建任务 HTTP handle：列表/创建/读写删/步骤快照。文案与解析由调用方注入。
 */
export function createTaskHandlers<
  TStepKey extends string,
  TCreate extends { name: string },
  TExtra extends object = object,
>(config: CreateStudioTaskHandlersConfig<TStepKey, TCreate, TExtra>) {
  /** 返回支持任务名称查询和分页的任务列表。 */
  function handleListTasks(req: Request): Response {
    try {
      return jsonOk(config.list(config.parseTaskListQuery(req.url)));
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '查询参数无效', 400);
      }
      console.error(`[${config.logTag}] list`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 校验并创建任务，返回完整初始详情。 */
  async function handleCreateTask(req: Request): Promise<Response> {
    try {
      const body = config.parseCreateTaskRequest(await req.json());
      if (config.hasName(body.name)) {
        return jsonFail(ApiErrorCode.TASK_NAME_CONFLICT, TASK_NAME_CONFLICT_MESSAGE, 409);
      }
      const { name, ...extra } = body;
      const id = config.create(name, extra as Omit<TCreate, 'name'>);
      return jsonOk(config.load(id));
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, config.createInvalidMessage, 400);
      }
      console.error(`[${config.logTag}] create`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 返回指定任务的完整详情。 */
  function handleGetTask(id: string): Response {
    const task = config.load(id);
    return task ? jsonOk(task) : jsonFail(ApiErrorCode.TASK_NOT_FOUND, config.notFoundMessage, 404);
  }

  /** 仅更新指定任务的名称。 */
  async function handleUpdateTask(id: string, req: Request): Promise<Response> {
    try {
      const body = config.parseUpdateTaskRequest(await req.json());
      const current = config.load(id);
      if (!current) {
        return jsonFail(ApiErrorCode.TASK_NOT_FOUND, config.notFoundMessage, 404);
      }
      if (current.name !== body.name && config.hasName(body.name, id)) {
        return jsonFail(ApiErrorCode.TASK_NAME_CONFLICT, TASK_NAME_CONFLICT_MESSAGE, 409);
      }
      if (!config.updateName(id, body.name)) {
        return jsonFail(ApiErrorCode.TASK_NOT_FOUND, config.notFoundMessage, 404);
      }
      return jsonOk(config.load(id));
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称无效', 400);
      }
      console.error(`[${config.logTag}] update`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 删除指定任务及其步骤、资产。 */
  function handleDeleteTask(id: string): Response {
    try {
      return config.remove(id)
        ? jsonOk({ id })
        : jsonFail(ApiErrorCode.TASK_NOT_FOUND, config.notFoundMessage, 404);
    } catch (error) {
      console.error(`[${config.logTag}] delete`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 保存单个稳定语义步骤的快照，并先将内嵌 data URL 转为任务资产。 */
  async function handleSaveTaskStep(
    taskId: string,
    rawStepKey: string,
    req: Request,
  ): Promise<Response> {
    let stepKey: TStepKey;
    try {
      stepKey = config.parseStepKey(rawStepKey);
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '步骤标识无效', 400);
      }
      console.error(`[${config.logTag}] save step`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }

    try {
      if (!config.exists(taskId)) {
        return jsonFail(ApiErrorCode.TASK_NOT_FOUND, config.notFoundMessage, 404);
      }
      const body = config.parseSaveStepRequest(await req.json());
      const data = config.persistSnapshotAssets(taskId, stepKey, body.data);
      config.saveStep({
        taskId,
        stepKey,
        snapshotVersion: body.snapshotVersion,
        data,
      });
      return jsonOk(config.load(taskId)?.steps[stepKey] ?? null);
    } catch (error) {
      if (error instanceof ZodError || error instanceof SyntaxError) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '步骤数据无效', 400);
      }
      console.error(`[${config.logTag}] save step`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  /** 删除单一步骤快照，资产文件随任务删除时统一清理。 */
  function handleDeleteTaskStep(taskId: string, rawStepKey: string): Response {
    try {
      const stepKey = config.parseStepKey(rawStepKey);
      if (!config.exists(taskId)) {
        return jsonFail(ApiErrorCode.TASK_NOT_FOUND, config.notFoundMessage, 404);
      }
      config.deleteStep(taskId, stepKey);
      return jsonOk({ stepKey });
    } catch (error) {
      if (error instanceof ZodError) {
        return jsonFail(ApiErrorCode.INVALID_PARAMS, '步骤标识无效', 400);
      }
      console.error(`[${config.logTag}] delete step`, error);
      return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
    }
  }

  return {
    handleListTasks,
    handleCreateTask,
    handleGetTask,
    handleUpdateTask,
    handleDeleteTask,
    handleSaveTaskStep,
    handleDeleteTaskStep,
  };
}
