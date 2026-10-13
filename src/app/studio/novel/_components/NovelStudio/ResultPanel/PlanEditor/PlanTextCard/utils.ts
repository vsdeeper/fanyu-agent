/** 单段方案文本可保存：去掉空白后还有内容。 */
export function isSavablePlanText(value: string): boolean {
  return Boolean(value.trim());
}
