import type {
  EcommerceStepKey,
  EcommerceTaskType,
} from '@/app/api/studio/ecommerce/_shared/task-types';
import type { StudioPhase } from './types';

export type EcommerceWorkflowStepKey = EcommerceStepKey | 'complete';

export type EcommerceWorkflowStep = {
  key: EcommerceWorkflowStepKey;
  title: string;
};

const CURRENT_WORKFLOW: EcommerceWorkflowStep[] = [
  { key: 'analysis', title: '商业分析' },
  { key: 'visual', title: '营销主视觉' },
  { key: 'design', title: '视觉设计' },
  { key: 'complete', title: '预览生成物料' },
];

const POSTER_WORKFLOW: EcommerceWorkflowStep[] = [
  { key: 'visual', title: '营销主视觉' },
  { key: 'design', title: '营销海报' },
  { key: 'complete', title: '预览生成物料' },
];

const MAIN_IMAGE_WORKFLOW: EcommerceWorkflowStep[] = [
  { key: 'analysis', title: '主图分析' },
  { key: 'design', title: '主图设计' },
  { key: 'complete', title: '预览生成物料' },
];

/** 营销海报任务：视觉设计步改为海报出图，左栏为可选模特形象。 */
export function isPosterTask(taskType: EcommerceTaskType): boolean {
  return taskType === '营销海报';
}

/** 主图任务：主图分析到主图设计，跳过主视觉。 */
export function isMainImageTask(taskType: EcommerceTaskType): boolean {
  return taskType === '主图';
}

/** 按任务类型解析流程；主图三步，营销海报无商业分析步。 */
export function resolveEcommerceWorkflow(taskType: EcommerceTaskType): EcommerceWorkflowStep[] {
  if (isMainImageTask(taskType)) return MAIN_IMAGE_WORKFLOW;
  return isPosterTask(taskType) ? POSTER_WORKFLOW : CURRENT_WORKFLOW;
}

/** 将运行态 phase 映射到稳定步骤键，再由配置顺序计算 Steps 下标。 */
export function getWorkflowStepIndex(
  workflow: readonly EcommerceWorkflowStep[],
  phase: StudioPhase,
): number {
  const key: EcommerceWorkflowStepKey =
    phase === 'input' || phase === 'analyzing' || phase === 'analyzed'
      ? 'analysis'
      : phase === 'visual' || phase === 'visualGenerating'
        ? 'visual'
        : phase === 'design' || phase === 'designGenerating'
          ? 'design'
          : 'complete';
  return Math.max(
    0,
    workflow.findIndex((step) => step.key === key),
  );
}
