import { ECOMMERCE_TASK_TYPES } from '@/app/api/ecommerce/_shared/task-constants';

export const TASK_LIST_TITLE = '电商设计';

export const TASK_TYPE_OPTIONS = ECOMMERCE_TASK_TYPES.map((value) => ({
  label: value,
  value,
}));

export const CREATE_TASK_BUTTON = '新建任务';

export const RESET_BUTTON = '重置';

export const QUERY_BUTTON = '查询';

export const SEARCH_NAME_LABEL = '任务名称';

export const SEARCH_NAME_PLACEHOLDER = '请输入';

export const DEFAULT_PAGE_SIZE = 10;

export const DELETE_CONFIRM_TITLE = '删除电商设计任务';

export const DELETE_CONFIRM_DESCRIPTION = '任务数据和生成物料将一并删除，确定继续吗？';

export const STEP_LABELS = {
  analysis: '商业分析',
  visual: '营销主视觉',
  design: '视觉设计',
} as const;
