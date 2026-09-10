import type { StudioGenerateImageEvent } from '@/app/api/studio/_shared/generate-types';
import type { StudioJobPendingSlot, StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import { applyGenerateEvent } from '@/app/studio/_utils/generate-stream';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import type { DesignResultGroups, StudioPhase } from '../types';

/** 作业回声的槽位与服务端契约同形，逐字段构造让两侧漂移在编译期暴露。 */
export function toResultImage(slot: StudioJobPendingSlot): StudioResultImage {
  return {
    id: slot.id,
    aspectRatio: slot.aspectRatio,
    status: slot.status,
    ...(slot.url !== undefined ? { url: slot.url } : {}),
    ...(slot.error !== undefined ? { error: slot.error } : {}),
    ...(slot.themeId !== undefined ? { themeId: slot.themeId } : {}),
    ...(slot.themeTitle !== undefined ? { themeTitle: slot.themeTitle } : {}),
  };
}

/**
 * 把作业事件套用到占位槽上，得到该批次的结果图。
 * 事件按槽位 id 寻址，无需任何下标偏移；`from` 用于只套用尚未处理过的新事件。
 */
export function applyJobEvents(
  slots: readonly StudioResultImage[],
  events: readonly StudioGenerateImageEvent[],
  from = 0,
): StudioResultImage[] {
  return events
    .slice(from)
    .reduce((current, event) => applyGenerateEvent(current, event), [...slots]);
}

/**
 * 按 id 把新批次并入既有结果：同 id 以新批次为准，异 id 一律追加。
 * 用 Map 保序即「既有元素位置不动、新元素按批次顺序追加」。
 */
export function mergeBatchImages(
  prior: readonly StudioResultImage[],
  batch: readonly StudioResultImage[],
): StudioResultImage[] {
  const byId = new Map(prior.map((item) => [item.id, item]));
  for (const item of batch) byId.set(item.id, item);
  return [...byId.values()];
}

/** 把恢复出的批次并入指定任务类型的分组。 */
export function mergeBatchGroups(
  prior: DesignResultGroups,
  taskType: EcommerceTaskType,
  batch: readonly StudioResultImage[],
): DesignResultGroups {
  return { ...prior, [taskType]: mergeBatchImages(prior[taskType] ?? [], batch) };
}

/** 从作业快照重建该批次的占位槽（含已产出的结果）。 */
export function restoreBatchImages(job: StudioJobSnapshot): StudioResultImage[] {
  return applyJobEvents(job.data.pending.slots.map(toResultImage), job.data.events);
}

/**
 * 用服务端作业快照校准本地槽位。
 *
 * 建作业是幂等的：同任务同步骤已有运行中作业时，服务端原样返回旧作业、忽略本次 pending。
 * 此时客户端刚塞进 state 的自建槽位永远收不到事件，结算还会再并一份旧批次（界面出现双份结果）。
 * 故丢弃服务端不认得的本地 pending 槽位，再按 id 并入服务端槽位。
 */
export function syncJobSlots(
  current: readonly StudioResultImage[],
  serverSlots: readonly StudioJobPendingSlot[],
): StudioResultImage[] {
  const serverIds = new Set(serverSlots.map((slot) => slot.id));
  const kept = current.filter((item) => item.status !== 'pending' || serverIds.has(item.id));
  return mergeBatchImages(kept, serverSlots.map(toResultImage));
}

/** 分组维度的 `syncJobSlots`。 */
export function syncJobGroupSlots(
  prior: DesignResultGroups,
  taskType: EcommerceTaskType,
  serverSlots: readonly StudioJobPendingSlot[],
): DesignResultGroups {
  return { ...prior, [taskType]: syncJobSlots(prior[taskType] ?? [], serverSlots) };
}

/** 作业所属步骤对应的「生成中」相位；分析不入作业，故只可能是两步出图。 */
export function jobGeneratingPhase(stepKey: string): StudioPhase | null {
  if (stepKey === 'visual') return 'visualGenerating';
  if (stepKey === 'design') return 'designGenerating';
  return null;
}

/**
 * 作业到达终态时，是否应把相位推进到结果步。
 *
 * 两种情况都不推，只落库：作业在首屏就已是终态（用户没看着它跑完，保持「再次进入停在第一步」），
 * 或用户已退回其它步骤（生成中可以点上一步，此时把相位推回去等于把用户从刚退到的步骤里拽出来）。
 * 结果已写进快照与 state，用户走到该步自然能看到。
 */
export function shouldAdvancePhase(input: {
  jobStepKey: string;
  currentPhase: StudioPhase;
  settledAtMount: boolean;
}): boolean {
  if (input.settledAtMount) return false;
  return jobGeneratingPhase(input.jobStepKey) === input.currentPhase;
}
