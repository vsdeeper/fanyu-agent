import type { StudioFormState, StudioSpecFields } from '../../types';

/**
 * 把 GenerateSpecForm 的整表变更拆回规格 / 数量回调。
 * 修复：规格与数量若连发两次父级 setState，第二次会用旧 form 把清晰度等改动盖回默认 2K。
 */
export function dispatchSpecFormChange(
  next: StudioFormState,
  currentCount: string | undefined,
  onFormChange: (next: StudioSpecFields) => void,
  onCountChange?: (value: string) => void,
): void {
  const { count: nextCount, ...rest } = next;
  if (currentCount !== undefined && nextCount !== currentCount) {
    onCountChange?.(nextCount);
    return;
  }
  onFormChange(rest);
}
