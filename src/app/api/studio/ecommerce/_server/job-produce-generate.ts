import 'server-only';

import type { StudioGenerateRequest } from '@/app/api/studio/_shared/generate-types';
import {
  JOB_SLOT_MISMATCH_MESSAGE,
  JOB_TASK_MISSING_MESSAGE,
} from '@/app/api/studio/_shared/job-constants';
import type { StudioJobPendingPlan } from '@/app/api/studio/_shared/job-types';
import { buildGeneratePlan } from '@/app/api/studio/_server/generate-plan';
import { generateStudioImage } from '@/app/api/studio/_server/generate-one';
import {
  StudioJobFailureError,
  type StudioJobProducer,
  type StudioJobProducerContext,
} from '@/app/api/studio/_server/job-runner';

export type EcommerceJobProducerConfig = {
  taskExists: (taskId: string) => boolean;
  /** 把 data URL 落成任务资产并返回站内 URL */
  saveAsset: (taskId: string, stepKey: string, dataUrl: string) => string;
};

/**
 * 电商出图作业的生产者：按 `buildGeneratePlan` 的顺序逐张出图，
 * 每张成功即落成任务资产，事件里带的是**站内资产 URL**（而非 data URL），
 * 因此客户端拿到后无需再上传，快照里也不会再嵌入数 MB 的 base64。
 */
export function createEcommerceJobProducer(
  config: EcommerceJobProducerConfig,
): (input: {
  taskId: string;
  stepKey: string;
  body: StudioGenerateRequest;
  pending: StudioJobPendingPlan;
}) => StudioJobProducer {
  return ({ taskId, stepKey, body, pending }) =>
    async ({ signal, emit }: StudioJobProducerContext) => {
      const plan = buildGeneratePlan(body);
      // 事件按槽位 id 回传，槽位与出图清单必须逐位对应；数量不等说明客户端建作业时的
      // 展开与 buildGeneratePlan 不一致，此时回传会挂错槽位或丢图，直接失败更好查
      if (plan.length !== pending.slots.length) {
        throw new StudioJobFailureError(JOB_SLOT_MISMATCH_MESSAGE);
      }
      const slotIdAt = (index: number) => pending.slots[index]?.id ?? '';

      for (const item of plan) {
        if (signal.aborted) return;

        // 任务被删后必须停：否则 saveAsset 会把刚被 removeTaskAssetDirectory 删掉的目录重新建出来，留下孤儿文件
        if (!config.taskExists(taskId)) {
          throw new StudioJobFailureError(JOB_TASK_MISSING_MESSAGE);
        }

        const result = await generateStudioImage({
          prompt: item.prompt,
          model: body.model,
          aspectRatio: body.aspectRatio,
          clarity: body.clarity,
          quality: body.quality,
          referenceImageDataUrls: item.referenceImageDataUrls,
          abortSignal: signal,
        });

        if (signal.aborted) return;

        if (result.ok) {
          emit({
            slotId: slotIdAt(item.index),
            url: config.saveAsset(taskId, stepKey, result.url),
          });
        } else {
          emit({ slotId: slotIdAt(item.index), error: result.error });
        }
      }
    };
}
