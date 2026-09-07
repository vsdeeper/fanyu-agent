import type { EcommerceTaskDetail } from '@/app/api/studio/ecommerce/_shared/task-types';
import { ECOMMERCE_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取电商设计任务列表。 */
export async function requestEcommerceTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/ecommerce', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造流程设计页地址。 */
export function getTaskEditorPath(task: Pick<EcommerceTaskDetail, 'id'>): string {
  return `${ECOMMERCE_PATH}/${encodeURIComponent(task.id)}`;
}
