import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { parseCreateTaskRequest, parseTaskListQuery } from './task-parse-request';
import {
  createProductRetouchTask,
  listProductRetouchTasks,
  loadProductRetouchTask,
} from './task-store';

/** 返回支持任务名称查询和分页的产品精修任务列表。 */
export function handleListProductRetouchTasks(req: Request): Response {
  try {
    return jsonOk(listProductRetouchTasks(parseTaskListQuery(req.url)));
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '查询参数无效', 400);
    }
    console.error('[product-retouch-tasks] list', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 校验并创建产品精修任务，返回完整初始详情。 */
export async function handleCreateProductRetouchTask(req: Request): Promise<Response> {
  try {
    const body = parseCreateTaskRequest(await req.json());
    const id = createProductRetouchTask(body.name);
    return jsonOk(loadProductRetouchTask(id));
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '任务名称无效', 400);
    }
    console.error('[product-retouch-tasks] create', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
