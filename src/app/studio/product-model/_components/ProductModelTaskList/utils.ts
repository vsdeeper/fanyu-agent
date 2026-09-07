import type { ProductModelTaskDetail } from '@/app/api/studio/product-model/_shared/task-types';
import { PRODUCT_MODEL_PATH } from '@/components/AppLayout/constants';
import { requestStudioTasks } from '@/app/studio/_utils/task-list';
import { DEFAULT_PAGE_SIZE } from './constants';

export { formatTaskDateTime, normalizeSearchName } from '@/app/studio/_utils/task-list';

/** 按名称与分页拉取产品模特任务列表。 */
export async function requestProductModelTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}) {
  return requestStudioTasks('/api/studio/product-model', {
    ...params,
    pageSize: params.pageSize ?? DEFAULT_PAGE_SIZE,
  });
}

/** 构造物料编辑页地址。 */
export function getTaskEditorPath(task: Pick<ProductModelTaskDetail, 'id'>): string {
  return `${PRODUCT_MODEL_PATH}/${encodeURIComponent(task.id)}`;
}
