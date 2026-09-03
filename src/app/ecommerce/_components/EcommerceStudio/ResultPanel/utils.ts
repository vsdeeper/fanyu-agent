import { RESULT_TITLE_ANALYSIS, RESULT_TITLE_GENERATE } from '../constants';
import type { StudioPhase } from '../types';

/** 商业分析/确认规划显示分析结果；出图阶段显示生成结果 */
export function toResultHeadTitle(phase: StudioPhase): string {
  if (phase === 'generating' || phase === 'done') return RESULT_TITLE_GENERATE;
  return RESULT_TITLE_ANALYSIS;
}

/** 右侧是否展示规划 Markdown（分析中、分析完成、确认规划） */
export function isPlanPhase(phase: StudioPhase): boolean {
  return phase === 'analyzing' || phase === 'analyzed' || phase === 'confirm';
}

/** 第一步（商业分析）不展示上一步 */
export function isPrevVisible(phase: StudioPhase): boolean {
  return phase === 'confirm' || phase === 'generating' || phase === 'done';
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

/** 分析完成后可进确认规划；确认规划后可出图 */
export function isNextDisabled(phase: StudioPhase): boolean {
  return phase !== 'analyzed' && phase !== 'confirm';
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
