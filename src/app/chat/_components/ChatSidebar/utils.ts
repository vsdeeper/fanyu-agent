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
