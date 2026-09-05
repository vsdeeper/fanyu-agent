import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { parseUpdateTaskRequest } from './task-parse-request';
import {
  deleteProductRetouchTask,
  loadProductRetouchTask,
  updateProductRetouchTaskName,
} from './task-store';

/** 返回指定产品精修任务的完整详情。 */
export function handleGetProductRetouchTask(id: string): Response {
  const task = loadProductRetouchTask(id);
  return task ? jsonOk(task) : jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品精修任务不存在', 404);
}

/** 仅更新指定任务的名称。 */
export async function handleUpdateProductRetouchTask(id: string, req: Request): Promise<Response> {
  try {
    const body = parseUpdateTaskRequest(await req.json());
    if (!updateProductRetouchTaskName(id, body.name)) {
      return jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品精修任务不存在', 404);
    }
    return jsonOk(loadProductRetouchTask(id));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称无效', 400);
    }
    console.error('[product-retouch-tasks] update', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 删除指定任务及其步骤、资产。 */
export function handleDeleteProductRetouchTask(id: string): Response {
  try {
    return deleteProductRetouchTask(id)
      ? jsonOk({ id })
      : jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品精修任务不存在', 404);
  } catch (error) {
    console.error('[product-retouch-tasks] delete', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
