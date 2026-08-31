import type { AuxiliaryPanelContent } from './types';
import { AUX_PANEL_SOURCE_LIST_WIDTH, AUX_PANEL_WIDTH } from './constants';

/** 来源概要面板标题 */
export function formatSourceListTitle(count: number): string {
  return `参考 ${count} 个来源`;
}

/** 按载荷类型取标题栏文案；未知 type 返回空串 */
export function getPanelTitle(content: AuxiliaryPanelContent | null): string {
  if (!content) return '';
  if (content.type === 'file-preview') return content.fileName;
  if (content.type === 'source-list') return formatSourceListTitle(content.items.length);
  return '';
}

/** 按载荷类型取侧栏宽度：来源概要固定 360px，其余走弹性宽度 */
export function getPanelWidth(content: AuxiliaryPanelContent | null): string {
  if (content?.type === 'source-list') return AUX_PANEL_SOURCE_LIST_WIDTH;
  return AUX_PANEL_WIDTH;
}

/** 面板是否正在展示指定消息的来源概要 */
export function isSourceListOpenFor(
  messageId: string,
  content: AuxiliaryPanelContent | null,
  open: boolean,
): boolean {
  return open && content?.type === 'source-list' && content.messageId === messageId;
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
