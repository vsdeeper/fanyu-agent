import { ECOMMERCE_TASK_TYPES } from '@/app/api/studio/ecommerce/_shared/task-constants';

export const TASK_LIST_TITLE = '电商设计';

export const TASK_TYPE_OPTIONS = ECOMMERCE_TASK_TYPES.map((value) => ({
  label: value,
  value,
}));

export const DEFAULT_PAGE_SIZE = 10;

export const DELETE_CONFIRM_TITLE = '删除电商设计任务';

export const DELETE_CONFIRM_DESCRIPTION = '任务数据和生成物料将一并删除，确定继续吗？';

export const STEP_LABELS = {
  analysis: '商业分析',
  visual: '营销主视觉',
  design: '视觉设计',
} as const;

export const DETAIL_IMAGE_STEP_LABELS = {
  analysis: '详情图分析',
  visual: '营销主视觉',
  design: '详情图设计',
} as const;

/** 列表「已产出步骤」文案：详情图用详情图分析/详情图设计，其余沿用默认。 */
export function stepLabelFor(
  taskType: (typeof ECOMMERCE_TASK_TYPES)[number],
  key: keyof typeof STEP_LABELS,
): string {
  if (taskType === '详情图') return DETAIL_IMAGE_STEP_LABELS[key];
  return STEP_LABELS[key];
}
