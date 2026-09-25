import type { NovelTaskDetail } from '@/app/api/studio/novel/_shared/task-types';
import { NOVEL_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取小说任务列表。 */
export async function requestNovelTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/novel', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造写作工作台地址。 */
export function getTaskEditorPath(task: Pick<NovelTaskDetail, 'id'>): string {
  return `${NOVEL_PATH}/${encodeURIComponent(task.id)}`;
}
