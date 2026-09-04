import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { parseUpdateTaskRequest } from './task-parse-request';
import { deleteEcommerceTask, loadEcommerceTask, updateEcommerceTaskName } from './task-store';

/** 返回指定电商设计任务的完整详情。 */
export function handleGetEcommerceTask(id: string): Response {
  const task = loadEcommerceTask(id);
  return task ? jsonOk(task) : jsonFail(ApiErrorCode.TASK_NOT_FOUND, '电商设计任务不存在', 404);
}

/** 仅更新指定任务的名称。 */
export async function handleUpdateEcommerceTask(id: string, req: Request): Promise<Response> {
  try {
    const body = parseUpdateTaskRequest(await req.json());
    if (!updateEcommerceTaskName(id, body.name)) {
      return jsonFail(ApiErrorCode.TASK_NOT_FOUND, '电商设计任务不存在', 404);
    }
    return jsonOk(loadEcommerceTask(id));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称无效', 400);
    }
    console.error('[ecommerce-tasks] update', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 删除指定任务及其步骤、资产。 */
export function handleDeleteEcommerceTask(id: string): Response {
  try {
    return deleteEcommerceTask(id)
      ? jsonOk({ id })
      : jsonFail(ApiErrorCode.TASK_NOT_FOUND, '电商设计任务不存在', 404);
  } catch (error) {
    console.error('[ecommerce-tasks] delete', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
