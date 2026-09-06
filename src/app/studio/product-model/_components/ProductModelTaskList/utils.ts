import type {
  ProductModelTaskDetail,
  ProductModelTaskListData,
} from '@/app/api/product-model/_shared/task-types';
import { PRODUCT_MODEL_PATH } from '@/components/AppLayout/constants';
import { apiGet } from '@/lib/shared/client/api-client';
import { DEFAULT_PAGE_SIZE } from './constants';

/** 按名称与分页拉取产品模特任务列表。 */
export async function requestProductModelTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}): Promise<{ items: ProductModelTaskListData['items']; total: number }> {
  const query = new URLSearchParams({
    current: String(params.current ?? 1),
    pageSize: String(params.pageSize ?? DEFAULT_PAGE_SIZE),
  });
  if (params.name?.trim()) query.set('name', params.name.trim());
  const result = await apiGet<ProductModelTaskListData>(
    `/api/product-model/tasks?${query.toString()}`,
    {
      silent: true,
    },
  );
  return { items: result.items, total: result.total };
}

/** 构造物料编辑页地址。 */
export function getTaskEditorPath(task: Pick<ProductModelTaskDetail, 'id'>): string {
  return `${PRODUCT_MODEL_PATH}/${encodeURIComponent(task.id)}`;
}

/** 将 ISO 时间转为本地 `YYYY-MM-DD HH:mm:ss`；无法解析则原样返回。 */
export function formatTaskDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 从查询表单取出任务名称，空串视为未筛选。 */
export function normalizeSearchName(name?: string): string | undefined {
  const trimmed = name?.trim();
  return trimmed ? trimmed : undefined;
}
