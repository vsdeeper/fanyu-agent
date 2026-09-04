import 'server-only';

import { z } from 'zod';
import { ECOMMERCE_STEP_KEYS, ECOMMERCE_TASK_TYPES } from '../_shared/task-constants';
import type {
  CreateEcommerceTaskRequest,
  EcommerceStepKey,
  SaveEcommerceTaskStepRequest,
  UpdateEcommerceTaskRequest,
} from '../_shared/task-types';

const createTaskSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
  taskType: z.enum(ECOMMERCE_TASK_TYPES),
});

const updateTaskSchema = z.strictObject({
  name: z.string().trim().min(1).max(100),
});

const saveStepSchema = z.strictObject({
  snapshotVersion: z.number().int().positive(),
  data: z.unknown(),
});

/** 解析新增任务请求，限制名称长度和任务类型。 */
export function parseCreateTaskRequest(value: unknown): CreateEcommerceTaskRequest {
  return createTaskSchema.parse(value);
}

/** 解析任务更新请求，只接受名称字段。 */
export function parseUpdateTaskRequest(value: unknown): UpdateEcommerceTaskRequest {
  return updateTaskSchema.parse(value);
}

/** 校验步骤保存请求的快照版本及数据。 */
export function parseSaveStepRequest(value: unknown): SaveEcommerceTaskStepRequest {
  return saveStepSchema.parse(value);
}

/** 将路由参数校验为稳定的步骤语义键。 */
export function parseEcommerceStepKey(value: string): EcommerceStepKey {
  return z.enum(ECOMMERCE_STEP_KEYS).parse(value);
}

/** 解析任务列表查询参数并限制分页范围。 */
export function parseTaskListQuery(url: string): {
  name?: string;
  page: number;
  pageSize: number;
} {
  const params = new URL(url).searchParams;
  const parsed = z
    .object({
      name: z.string().trim().max(100).optional(),
      current: z.coerce.number().int().min(1).default(1),
      pageSize: z.coerce.number().int().min(1).max(100).default(10),
    })
    .parse({
      name: params.get('name') || undefined,
      current: params.get('current') || undefined,
      pageSize: params.get('pageSize') || undefined,
    });
  return { name: parsed.name, page: parsed.current, pageSize: parsed.pageSize };
}
