import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { TASK_NAME_CONFLICT_MESSAGE } from '../_shared/task-constants';
import { parseUpdateTaskRequest } from './task-parse-request';
import {
  deleteProductModelTask,
  hasProductModelTaskName,
  loadProductModelTask,
  updateProductModelTaskName,
} from './task-store';

/** 返回指定产品模特任务的完整详情。 */
export function handleGetProductModelTask(id: string): Response {
  const task = loadProductModelTask(id);
  return task ? jsonOk(task) : jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品模特任务不存在', 404);
}

/** 仅更新指定任务的名称。 */
export async function handleUpdateProductModelTask(id: string, req: Request): Promise<Response> {
  try {
    const body = parseUpdateTaskRequest(await req.json());
    const current = loadProductModelTask(id);
    if (!current) {
      return jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品模特任务不存在', 404);
    }
    if (current.name !== body.name && hasProductModelTaskName(body.name, id)) {
      return jsonFail(ApiErrorCode.TASK_NAME_CONFLICT, TASK_NAME_CONFLICT_MESSAGE, 409);
    }
    if (!updateProductModelTaskName(id, body.name)) {
      return jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品模特任务不存在', 404);
    }
    return jsonOk(loadProductModelTask(id));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称无效', 400);
    }
    console.error('[product-model-tasks] update', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 删除指定任务及其步骤、资产。 */
export function handleDeleteProductModelTask(id: string): Response {
  try {
    return deleteProductModelTask(id)
      ? jsonOk({ id })
      : jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品模特任务不存在', 404);
  } catch (error) {
    console.error('[product-model-tasks] delete', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
