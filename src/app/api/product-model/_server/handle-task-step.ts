import 'server-only';

import { ZodError } from 'zod';
import { ApiErrorCode, jsonFail, jsonOk } from '@/lib/shared/server/api-response';
import { persistSnapshotAssets } from './task-assets';
import { parseProductModelStepKey, parseSaveStepRequest } from './task-parse-request';
import {
  deleteProductModelTaskStep,
  loadProductModelTask,
  productModelTaskExists,
  saveProductModelTaskStep,
} from './task-store';

/** 保存单个稳定语义步骤的快照，并先将内嵌 data URL 转为任务资产。 */
export async function handleSaveProductModelTaskStep(
  taskId: string,
  rawStepKey: string,
  req: Request,
): Promise<Response> {
  try {
    const stepKey = parseProductModelStepKey(rawStepKey);
    if (!productModelTaskExists(taskId)) {
      return jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品模特任务不存在', 404);
    }
    const body = parseSaveStepRequest(await req.json());
    const data = persistSnapshotAssets(taskId, stepKey, body.data);
    saveProductModelTaskStep({
      taskId,
      stepKey,
      snapshotVersion: body.snapshotVersion,
      data,
    });
    return jsonOk(loadProductModelTask(taskId)?.steps[stepKey] ?? null);
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '步骤数据无效', 400);
    }
    console.error('[product-model-tasks] save step', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}

/** 删除单一步骤快照，资产文件随任务删除时统一清理。 */
export function handleDeleteProductModelTaskStep(taskId: string, rawStepKey: string): Response {
  try {
    const stepKey = parseProductModelStepKey(rawStepKey);
    if (!productModelTaskExists(taskId)) {
      return jsonFail(ApiErrorCode.TASK_NOT_FOUND, '产品模特任务不存在', 404);
    }
    deleteProductModelTaskStep(taskId, stepKey);
    return jsonOk({ stepKey });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonFail(ApiErrorCode.INVALID_PARAMS, '步骤标识无效', 400);
    }
    console.error('[product-model-tasks] delete step', error);
    return jsonFail(ApiErrorCode.INTERNAL_ERROR, '服务暂时不可用，请稍后重试', 500);
  }
}
