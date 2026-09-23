import type { ChatListItem } from '@/app/api/chats/_shared/types';
import { apiGet } from '@/lib/shared/client/api-client';

type ChatListData = {
  items: ChatListItem[];
};

/** 将 ISO 时间转为本地 `YYYY-MM-DD HH:mm:ss`；无法解析则原样返回。 */
export function formatChatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/** 从查询表单取出对话名称，空串视为未筛选。 */
export function normalizeSearchTitle(title?: string): string | undefined {
  const trimmed = title?.trim();
  return trimmed ? trimmed : undefined;
}

/** 将日界转为 ISO：from 为当天 00:00:00.000，to 为当天 23:59:59.999（本地时区）。 */
export function toCreatedRangeIso(
  from?: Date | null,
  to?: Date | null,
): { createdFrom?: string; createdTo?: string } {
  let createdFrom: string | undefined;
  let createdTo: string | undefined;
  if (from) {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    createdFrom = start.toISOString();
  }
  if (to) {
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999);
    createdTo = end.toISOString();
  }
  return { createdFrom, createdTo };
}

/** 表格底部总条数文案。 */
export function formatTotalCount(total: number): string {
  return `共 ${total} 条`;
}

/** 按名称与创建日期拉取对话管理列表（当前筛选全量）。 */
export async function requestManagedChats(params: {
  title?: string;
  createdFrom?: string;
  createdTo?: string;
}): Promise<ChatListItem[]> {
  const query = new URLSearchParams();
  if (params.title?.trim()) query.set('title', params.title.trim());
  if (params.createdFrom) query.set('createdFrom', params.createdFrom);
  if (params.createdTo) query.set('createdTo', params.createdTo);
  const qs = query.toString();
  const result = await apiGet<ChatListData>(`/api/chats${qs ? `?${qs}` : ''}`, { silent: true });
  return result.items;
}
