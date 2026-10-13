import type { NovelStepKey } from '@/app/api/studio/novel/_shared/task-types';

export const TASK_LIST_TITLE = '小说';

export const DEFAULT_PAGE_SIZE = 10;

export const DELETE_CONFIRM_TITLE = '删除小说任务';

export const DELETE_CONFIRM_DESCRIPTION = '任务数据与写作结果将一并删除，确定继续吗？';

export const STEP_LABELS: Record<NovelStepKey, string> = {
  research: '选题调研',
  plan: '创作方案',
  cast: '角色设定',
  chapters: '卷章设计',
  write: '正文写作',
};
