import { getModelCapability } from '../model-options';
import type { StudioPhase, StudioSpecFields } from '../types';

/** 商业分析步骤（输入、分析中、分析完成同属一步） */
export function isAnalyzePhase(phase: StudioPhase): boolean {
  return phase === 'input' || phase === 'analyzing' || phase === 'analyzed';
}

/** 营销主视觉步骤（含生图中，步进条停在第二步） */
export function isVisualPhase(phase: StudioPhase): boolean {
  return phase === 'visual' || phase === 'visualGenerating';
}

/** 产品模特及完成（左栏展示模特表单） */
export function isModelPhase(phase: StudioPhase): boolean {
  return phase === 'model' || phase === 'modelGenerating' || phase === 'done';
}

/** 更新表单中的单个字段 */
export function patchFormState<T extends object, K extends keyof T>(
  state: T,
  key: K,
  value: T[K],
): T {
  return { ...state, [key]: value };
}

/**
 * 切模型时按模型规格重置清晰度与质量默认：
 * 清晰度默认 spec.size.default（2K，不支持回退 1K）；不支持的模型不再强制质量默认。
 */
export function patchModel<T extends StudioSpecFields>(state: T, model: string): T {
  const next = { ...state, model };
  const capability = getModelCapability(model);
  if (!capability) return next;
  next.clarity = capability.clarityDefault;
  if (capability.qualityOptions?.length) {
    next.quality = capability.qualityDefault ?? 'high';
  }
  return next;
}
