import type { DesignType, StudioFormState } from '../types';

/** 更新表单中的单个字段 */
export function patchFormState<K extends keyof StudioFormState>(
  state: StudioFormState,
  key: K,
  value: StudioFormState[K],
): StudioFormState {
  return { ...state, [key]: value };
}

/** 将 Segmented 的值收窄为 DesignType */
export function toDesignType(value: string | number): DesignType {
  if (value === 'detail' || value === 'ad' || value === 'main') return value;
  return 'main';
}
