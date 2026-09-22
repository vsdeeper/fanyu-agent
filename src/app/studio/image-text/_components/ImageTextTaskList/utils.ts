import type { ImageTextTaskDetail } from '@/app/api/studio/image-text/_shared/task-types';
import { IMAGE_TEXT_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取图文任务列表。 */
export async function requestImageTextTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/image-text', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造图文工作台地址。 */
export function getTaskEditorPath(task: Pick<ImageTextTaskDetail, 'id'>): string {
  return `${IMAGE_TEXT_PATH}/${encodeURIComponent(task.id)}`;
}
