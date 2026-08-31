import type { AuxiliaryPanelContent } from './types';

/** 按载荷类型取标题栏文案；未知 type 返回空串 */
export function getPanelTitle(content: AuxiliaryPanelContent | null): string {
  if (!content) return '';
  if (content.type === 'file-preview') return content.fileName;
  return '';
}

/** 是否为输入类焦点，Esc 应交给输入框而不是关面板 */
export function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

/** 系统要求减少动效时关闭后立即卸 DOM，不等过渡 */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
