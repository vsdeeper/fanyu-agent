import type { MouseEvent } from 'react';
import type { FileCardStatus } from './types';

/**
 * 卡片主体点击：就绪态转发 onPreview；未传入则为空操作。
 */
export function handlePreviewClick(onPreview?: () => void): void {
  onPreview?.();
}

/**
 * 仅就绪态绑定预览点击，避免失败卡误触。
 */
export function bindPreviewClick(
  status: FileCardStatus,
  onPreview?: () => void,
): (() => void) | undefined {
  if (status !== 'ready') return undefined;
  return () => handlePreviewClick(onPreview);
}

/**
 * 下载链接点击时阻止冒泡，避免同时触发卡片主体预览。
 */
export function handleDownloadClick(event: MouseEvent<HTMLAnchorElement>): void {
  event.stopPropagation();
}
