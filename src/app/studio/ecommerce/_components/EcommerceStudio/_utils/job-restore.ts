import type { StudioGenerateImageEvent } from '@/app/api/studio/_shared/generate-types';
import type { StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import { applyGenerateEvent } from '@/app/studio/_utils/generate-stream';
import type { StudioResultImage } from '@/app/studio/_utils/result-images';
import type { DesignResultGroups, StudioPhase } from '../types';

/**
 * 把作业事件套用到占位槽上，得到该批次的结果图。
 *
 * 两边的 index 基准不同，必须靠 `batchStartIndex` 对齐：作业事件的 index 是**批次内相对下标**
 * （`buildGeneratePlan` 从 0 开始逐个累加），而槽位的 index 是**结果集中的绝对下标**
 * （`pendingImagesFromCount` / `appendPendingThemeImages` 都从既有长度起算）。
 * 少了这一步偏移，第二次及以后的生成（batchStartIndex > 0）会匹配不到任何槽位，
 * 表现为「图已生成、资产已落盘，界面上却仍是空占位」。
 */
export function applyJobEvents(
  slots: readonly StudioResultImage[],
  events: readonly StudioGenerateImageEvent[],
  batchStartIndex: number,
  from = 0,
): StudioResultImage[] {
  return events
    .slice(from)
    .reduce((current, event) => applyGenerateEvent(current, event, batchStartIndex), [...slots]);
}

/**
 * 按 index 把新批次并入既有结果。
 * 不用「先序 ++ 批次」拼接：那要求既有长度恰好等于批次起始下标，一旦快照与批次不同步就会错位。
 */
export function mergeBatchImages(
  prior: readonly StudioResultImage[],
  batch: readonly StudioResultImage[],
): StudioResultImage[] {
  const byIndex = new Map(prior.map((item) => [item.index, item]));
  for (const item of batch) byIndex.set(item.index, item);
  return [...byIndex.values()].sort((a, b) => a.index - b.index);
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
  return applyJobEvents(
    job.data.pending.slots as StudioResultImage[],
    job.data.events,
    job.data.pending.batchStartIndex,
  );
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
