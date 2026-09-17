import type { StyleTuningTaskDetail } from '@/app/api/studio/style-tuning/_shared/task-types';
import { STYLE_TUNING_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取文风调任务列表。 */
export async function requestStyleTuningTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/style-tuning', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造工作台地址。 */
export function getTaskEditorPath(task: Pick<StyleTuningTaskDetail, 'id'>): string {
  return `${STYLE_TUNING_PATH}/${encodeURIComponent(task.id)}`;
}
