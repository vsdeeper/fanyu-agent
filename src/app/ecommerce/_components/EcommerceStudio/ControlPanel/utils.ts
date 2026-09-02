import { DEFAULT_ASPECT_BY_TYPE } from '../constants';
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

/** 切换类型时同步默认画幅，其它字段保持 */
export function patchDesignType(state: StudioFormState, designType: DesignType): StudioFormState {
  return {
    ...state,
    designType,
    aspectRatio: DEFAULT_ASPECT_BY_TYPE[designType],
  };
}
