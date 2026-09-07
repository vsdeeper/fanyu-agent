import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import {
  EMPTY_DESIGN_HINT,
  EMPTY_POSTER_HINT,
  EMPTY_RESULT_HINT,
  EMPTY_VISUAL_HINT,
  RESULT_TITLE_DESIGN,
  RESULT_TITLE_POSTER,
  RESULT_TITLE_ANALYSIS,
  RESULT_TITLE_VISUAL,
} from '../constants';
import type { StudioPhase } from '../types';
import { isPosterTask } from '../workflow';

/** 右侧标题随步骤切换 */
export function toResultHeadTitle(phase: StudioPhase, taskType: EcommerceTaskType): string {
  if (isDesignResultPhase(phase)) {
    return isPosterTask(taskType) ? RESULT_TITLE_POSTER : RESULT_TITLE_DESIGN;
  }
  if (isVisualResultPhase(phase)) return RESULT_TITLE_VISUAL;
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

/** 视觉设计结果区（含生图中） */
export function isDesignResultPhase(phase: StudioPhase): boolean {
  return phase === 'design' || phase === 'designGenerating';
}

/** 第一步不展示上一步：主图/详情图为商业分析，海报为主视觉。 */
export function isPrevVisible(phase: StudioPhase, isPoster = false): boolean {
  if (isPoster) return phase !== 'visual' && phase !== 'visualGenerating';
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
 * 下一步是否禁用：分析须有正文，主视觉须点选，视觉设计须至少有一张成果。
 */
export function isNextDisabled(
  phase: StudioPhase,
  analysisText: string,
  selectedVisualIndex: number | null,
  hasDesignResults: boolean,
): boolean {
  if (phase === 'analyzed') return !analysisText.trim();
  if (phase === 'visual') return selectedVisualIndex === null;
  if (phase === 'design') return !hasDesignResults;
  return true;
}

/** 空态提示随步骤切换 */
export function toEmptyHint(phase: StudioPhase, taskType: EcommerceTaskType): string {
  if (isDesignResultPhase(phase)) {
    return isPosterTask(taskType) ? EMPTY_POSTER_HINT : EMPTY_DESIGN_HINT;
  }
  if (isVisualResultPhase(phase)) return EMPTY_VISUAL_HINT;
  return EMPTY_RESULT_HINT;
}

/** 出图预览地址（工作台结果为 data URL） */
export function getImageSrc(asset: { url?: string }): string {
  return asset.url ?? '';
}

export { aspectRatioToSize, groupResultImagesByRatio } from '@/app/studio/_utils/result-images';
