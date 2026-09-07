import 'server-only';

import { z } from 'zod';
import type { SaveStudioTaskStepRequest, UpdateStudioTaskRequest } from '../_shared/task-types';

export type CreateStudioTaskParseRequestConfig<TStepKey extends string, TCreate> = {
  stepKeys: readonly [TStepKey, ...TStepKey[]];
  createSchema: z.ZodType<TCreate>;
};

/**
 * 创建任务请求解析：名称、步骤键、列表查询共用；创建体 schema 由产品注入。
 */
export function createTaskParseRequest<TStepKey extends string, TCreate>(
  config: CreateStudioTaskParseRequestConfig<TStepKey, TCreate>,
) {
  const updateTaskSchema = z.strictObject({
    name: z.string().trim().min(1).max(100),
  });

  const saveStepSchema = z.strictObject({
    snapshotVersion: z.number().int().positive(),
    data: z.unknown(),
  });

  const stepKeySchema = z.enum(config.stepKeys);

  /** 解析新增任务请求。 */
  function parseCreateTaskRequest(value: unknown): TCreate {
    return config.createSchema.parse(value);
  }

  /** 解析任务更新请求，只接受名称字段。 */
  function parseUpdateTaskRequest(value: unknown): UpdateStudioTaskRequest {
    return updateTaskSchema.parse(value);
  }

  /** 校验步骤保存请求的快照版本及数据。 */
  function parseSaveStepRequest(value: unknown): SaveStudioTaskStepRequest {
    return saveStepSchema.parse(value);
  }

  /** 将路由参数校验为稳定的步骤语义键。 */
  function parseStepKey(value: string): TStepKey {
    return stepKeySchema.parse(value);
  }

  /** 解析任务列表查询参数并限制分页范围。 */
  function parseTaskListQuery(url: string): {
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

  return {
    parseCreateTaskRequest,
    parseUpdateTaskRequest,
    parseSaveStepRequest,
    parseStepKey,
    parseTaskListQuery,
  };
}
