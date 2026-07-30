/** 侧栏分组：30 天内 / YYYY-MM（纯函数，可在客户端使用） */
export function getChatGroupLabel(updatedAt: string, now = new Date()): string {
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return '更早';

  const diffMs = now.getTime() - updated.getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  if (diffMs >= 0 && diffMs < thirtyDaysMs) {
    return '30 天内';
  }

  const year = updated.getFullYear();
  const month = String(updated.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
