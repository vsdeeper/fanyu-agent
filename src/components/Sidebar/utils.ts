import { CHAT_DRAFT_PATH } from './constants';

/** 侧栏分组：今天 / 昨天 / 更早（按自然日边界，纯函数，可在客户端使用） */
export function getChatGroupLabel(updatedAt: string, now = new Date()): string {
  const updated = new Date(updatedAt);

  // 按「自然日」判定今天/昨天：昨天是日历上的昨天，而非 24~48 小时前
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (updated.getTime() >= startOfToday.getTime()) return '今天';
  if (updated.getTime() >= startOfYesterday.getTime()) return '昨天';
  return '更早';
}

/**
 * 从 pathname 解析当前会话 id。仅 `/chat/[id]` 有值；草稿 /chat 与非聊天路由（如 /studio）返回空串。
 */
export function getActiveChatIdFromPathname(pathname: string): string {
  if (!pathname.startsWith(`${CHAT_DRAFT_PATH}/`)) return '';
  const rest = pathname.slice(`${CHAT_DRAFT_PATH}/`.length);
  if (!rest || rest.includes('/')) return '';
  return rest;
}
