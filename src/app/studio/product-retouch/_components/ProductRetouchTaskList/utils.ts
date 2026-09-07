import type { ProductRetouchTaskDetail } from '@/app/api/studio/product-retouch/_shared/task-types';
import { PRODUCT_RETOUCH_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取产品精修任务列表。 */
export async function requestProductRetouchTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/product-retouch', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造物料编辑页地址。 */
export function getTaskEditorPath(task: Pick<ProductRetouchTaskDetail, 'id'>): string {
  return `${PRODUCT_RETOUCH_PATH}/${encodeURIComponent(task.id)}`;
}
