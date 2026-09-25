import type { LongArticleTaskDetail } from '@/app/api/studio/long-article/_shared/task-types';
import { LONG_ARTICLE_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取长文任务列表。 */
export async function requestLongArticleTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/long-article', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造物料编辑页地址。 */
export function getTaskEditorPath(task: Pick<LongArticleTaskDetail, 'id'>): string {
  return `${LONG_ARTICLE_PATH}/${encodeURIComponent(task.id)}`;
}
