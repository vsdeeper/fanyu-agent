import type { EcommerceStepKey, EcommerceTaskType } from '@/app/api/ecommerce/_shared/task-types';
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
  { key: 'complete', title: '完成' },
];

const WORKFLOW_BY_TASK_AND_VERSION: Record<string, EcommerceWorkflowStep[]> = {
  '主图:1': CURRENT_WORKFLOW,
  '详情图:1': CURRENT_WORKFLOW,
  '营销海报:1': CURRENT_WORKFLOW,
};

/** 按任务类型和创建时的版本解析流程；当前三个类型暂时共用 v1。 */
export function resolveEcommerceWorkflow(
  taskType: EcommerceTaskType,
  workflowVersion: number,
): EcommerceWorkflowStep[] {
  return WORKFLOW_BY_TASK_AND_VERSION[`${taskType}:${workflowVersion}`] ?? CURRENT_WORKFLOW;
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
