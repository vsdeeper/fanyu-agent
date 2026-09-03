import {
  EMPTY_MODEL_HINT,
  EMPTY_RESULT_HINT,
  EMPTY_VISUAL_HINT,
  RESULT_TITLE_ANALYSIS,
  RESULT_TITLE_MODEL,
  RESULT_TITLE_VISUAL,
} from '../constants';
import type { StudioPhase } from '../types';

/** 右侧标题随步骤切换 */
export function toResultHeadTitle(phase: StudioPhase): string {
  if (isVisualResultPhase(phase)) return RESULT_TITLE_VISUAL;
  if (isModelResultPhase(phase)) return RESULT_TITLE_MODEL;
  return RESULT_TITLE_ANALYSIS;
}

/** 右侧是否展示规划 Markdown（分析中、分析完成） */
export function isPlanPhase(phase: StudioPhase): boolean {
  return phase === 'analyzing' || phase === 'analyzed';
}

/** 营销主视觉结果区（含生图中） */
export function isVisualResultPhase(phase: StudioPhase): boolean {
  return phase === 'visual' || phase === 'visualGenerating';
}

/** 产品模特结果区（含完成） */
export function isModelResultPhase(phase: StudioPhase): boolean {
  return phase === 'model' || phase === 'modelGenerating' || phase === 'done';
}

/** 第一步（商业分析）不展示上一步 */
export function isPrevVisible(phase: StudioPhase): boolean {
  return phase !== 'input' && phase !== 'analyzing' && phase !== 'analyzed';
}

/** 规划滚动区是否贴底（普通 overflow，底部 ≈ scrollHeight - clientHeight） */
export function isPlanNearBottom(el: HTMLElement, threshold: number): boolean {
  return el.scrollHeight - el.clientHeight - el.scrollTop <= threshold;
}

/** 将规划滚动区对齐到内容底部 */
export function scrollPlanToBottom(el: HTMLElement): void {
  el.scrollTop = el.scrollHeight;
}

export type PlanScrollPinState = {
  pinned: boolean;
  lastHeight: number;
  follow: boolean;
};

/**
 * 根据一次 scroll 事件更新贴底状态。
 * 正文变高（XMarkdown 延迟排版）也会触发 scroll，不能当成用户上滑，否则会关掉跟随。
 */
export function reconcilePlanScrollPin(
  el: HTMLElement,
  programmatic: boolean,
  pinned: boolean,
  lastHeight: number,
  threshold: number,
): PlanScrollPinState {
  const height = el.scrollHeight;
  if (programmatic) {
    return { pinned, lastHeight: height, follow: false };
  }
  if (height > lastHeight) {
    return { pinned, lastHeight: height, follow: pinned };
  }
  return {
    pinned: isPlanNearBottom(el, threshold),
    lastHeight: height,
    follow: false,
  };
}

/**
 * 下一步是否禁用：分析完成可进视觉；视觉须已点选标准；模特须至少一张成功。
 */
export function isNextDisabled(
  phase: StudioPhase,
  analysisText: string,
  selectedVisualIndex: number | null,
  hasReadyModelImage: boolean,
): boolean {
  if (phase === 'analyzed') return !analysisText.trim();
  if (phase === 'visual') return selectedVisualIndex === null;
  if (phase === 'model') return !hasReadyModelImage;
  return true;
}

/** 空态提示随步骤切换 */
export function toEmptyHint(phase: StudioPhase): string {
  if (isVisualResultPhase(phase)) return EMPTY_VISUAL_HINT;
  if (isModelResultPhase(phase)) return EMPTY_MODEL_HINT;
  return EMPTY_RESULT_HINT;
}

/** 出图预览地址（工作台结果为 data URL） */
export function getImageSrc(asset: { url?: string }): string {
  return asset.url ?? '';
}

/**
 * 依据宽高比串（如 3:4、16:9）把基准宽换算为预览单元格尺寸。
 * 与表单「尺寸比例」对标，使预览/骨架比例一致；非法比例回退正方形。
 */
export function aspectRatioToSize(
  ratio: string,
  baseWidth: number,
): { width: number; height: number } {
  const m = /^(\d+):(\d+)$/.exec(ratio.trim());
  const w = m ? Number(m[1]) : 0;
  const h = m ? Number(m[2]) : 0;
  if (w <= 0 || h <= 0) return { width: baseWidth, height: baseWidth };
  return { width: baseWidth, height: Math.round((baseWidth * h) / w) };
}
