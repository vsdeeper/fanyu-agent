import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { parseCreateTaskRequest, parseTaskListQuery } from './task-parse-request';
import { createEcommerceTask, listEcommerceTasks, loadEcommerceTask } from './task-store';

/** 返回支持任务名称查询和分页的电商设计任务列表。 */
export function handleListEcommerceTasks(req: Request): Response {
  try {
    return jsonOk(listEcommerceTasks(parseTaskListQuery(req.url)));
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '查询参数无效', 400);
    }
    console.error('[ecommerce-tasks] list', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 校验并创建电商设计任务，返回完整初始详情。 */
export async function handleCreateEcommerceTask(req: Request): Promise<Response> {
  try {
    const body = parseCreateTaskRequest(await req.json());
    const id = createEcommerceTask(body.name, body.taskType);
    return jsonOk(loadEcommerceTask(id));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称或任务类型无效', 400);
    }
    console.error('[ecommerce-tasks] create', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
