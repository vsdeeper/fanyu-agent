import { apiGet } from '@/lib/shared/client/api-client';

type StudioTaskListData<TItem> = {
  items: TItem[];
  total: number;
};

/** 按名称与分页拉取工作室任务列表。 */
export async function requestStudioTasks<TItem>(
  apiBase: string,
  params: {
    name?: string;
    current?: number;
    pageSize?: number;
  },
): Promise<{ items: TItem[]; total: number }> {
  const query = new URLSearchParams({
    current: String(params.current ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.name?.trim()) query.set('name', params.name.trim());
  const result = await apiGet<StudioTaskListData<TItem>>(`${apiBase}/tasks?${query.toString()}`, {
    silent: true,
  });
  return { items: result.items, total: result.total };
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
