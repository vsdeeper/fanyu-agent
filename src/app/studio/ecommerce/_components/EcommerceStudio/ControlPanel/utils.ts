import { patchModel } from '../model-options';
import type { StudioPhase } from '../types';

/** 分析步骤（输入、分析中、分析完成同属一步）；电商仅主题规划类任务（主图 / 详情图）会进入该步骤 */
export function isAnalyzePhase(phase: StudioPhase): boolean {
  return phase === 'input' || phase === 'analyzing' || phase === 'analyzed';
}

/** 营销主视觉步骤（含生图中） */
export function isVisualPhase(phase: StudioPhase): boolean {
  return phase === 'visual' || phase === 'visualGenerating';
}

/** 视觉设计步骤（含生图中） */
export function isDesignPhase(phase: StudioPhase): boolean {
  return phase === 'design' || phase === 'designGenerating';
}

/** 更新表单中的单个字段 */
export function patchFormState<T extends object, K extends keyof T>(
  state: T,
  key: K,
  value: T[K],
): T {
  return { ...state, [key]: value };
}

export { patchModel };
