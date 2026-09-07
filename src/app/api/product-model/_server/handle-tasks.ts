import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { TASK_NAME_CONFLICT_MESSAGE } from '../_shared/task-constants';
import { parseCreateTaskRequest, parseTaskListQuery } from './task-parse-request';
import {
  createProductModelTask,
  hasProductModelTaskName,
  listProductModelTasks,
  loadProductModelTask,
} from './task-store';

/** 返回支持任务名称查询和分页的产品模特任务列表。 */
export function handleListProductModelTasks(req: Request): Response {
  try {
    return jsonOk(listProductModelTasks(parseTaskListQuery(req.url)));
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '查询参数无效', 400);
    }
    console.error('[product-model-tasks] list', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 校验并创建产品模特任务，返回完整初始详情。 */
export async function handleCreateProductModelTask(req: Request): Promise<Response> {
  try {
    const body = parseCreateTaskRequest(await req.json());
    if (hasProductModelTaskName(body.name)) {
      return jsonFail(ApiErrorCode.TASK_NAME_CONFLICT, TASK_NAME_CONFLICT_MESSAGE, 409);
    }
    const id = createProductModelTask(body.name);
    return jsonOk(loadProductModelTask(id));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称无效', 400);
    }
    console.error('[product-model-tasks] create', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
