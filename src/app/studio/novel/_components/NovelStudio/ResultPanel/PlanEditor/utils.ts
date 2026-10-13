/** 编辑器里新建条目用的短 id。 */
export function shortPlanId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
