import { DEFAULT_ASPECT_BY_TYPE } from '../constants';
import { getCountSpec, getModelCapability } from '../model-options';
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

/**
 * 切换类型时同步默认画幅与默认数量（数量随类型+平台），其它字段保持。
 */
export function patchDesignType(state: StudioFormState, designType: DesignType): StudioFormState {
  return {
    ...state,
    designType,
    aspectRatio: DEFAULT_ASPECT_BY_TYPE[designType],
    count: getCountSpec(designType, state.platform).default,
  };
}

/**
 * 切平台时：仅主图数量随平台变化；详情/广告为统一标准范围，不重置数量。
 */
export function patchPlatform(state: StudioFormState, platform: string): StudioFormState {
  if (state.designType !== 'main') return { ...state, platform };
  return {
    ...state,
    platform,
    count: getCountSpec('main', platform).default,
  };
}

/**
 * 切模型时按模型规格重置清晰度与质量默认：
 * 清晰度默认 spec.size.default（2K，不支持回退 1K）；不支持的模型隐藏质量字段，不再强制其默认。
 */
export function patchModel(state: StudioFormState, model: string): StudioFormState {
  const next = { ...state, model };
  const capability = getModelCapability(model);
  if (!capability) return next;
  next.clarity = capability.clarityDefault;
  if (capability.qualityOptions?.length) {
    next.quality = capability.qualityDefault ?? 'high';
  }
  return next;
}
