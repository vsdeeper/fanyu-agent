import type {
  EcommerceTaskDetail,
  EcommerceTaskListData,
} from '@/app/api/ecommerce/_shared/task-types';
import { apiGet } from '@/lib/shared/client/api-client';
import { DEFAULT_PAGE_SIZE } from './constants';

/** 按名称与分页拉取电商设计任务列表。 */
export async function requestEcommerceTasks(params: {
  name?: string;
  current?: number;
  pageSize?: number;
}): Promise<{ items: EcommerceTaskListData['items']; total: number }> {
  const query = new URLSearchParams({
    current: String(params.current ?? 1),
    pageSize: String(params.pageSize ?? DEFAULT_PAGE_SIZE),
  });
  if (params.name?.trim()) query.set('name', params.name.trim());
  const result = await apiGet<EcommerceTaskListData>(`/api/ecommerce/tasks?${query.toString()}`, {
    silent: true,
  });
  return { items: result.items, total: result.total };
}

/** 构造流程设计页地址。 */
export function getTaskEditorPath(task: Pick<EcommerceTaskDetail, 'id'>): string {
  return `/ecommerce/${encodeURIComponent(task.id)}`;
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
