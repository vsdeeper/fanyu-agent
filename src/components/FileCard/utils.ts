import type { MouseEvent } from 'react';
import { FILE_SIZE_UNITS } from './constants';
import type { FileCardStatus } from './types';

/**
 * 从文件名取扩展名并大写（DESIGN.md → MD）；无扩展名则不返回。
 */
export function getFileTypeLabel(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) return undefined;
  const ext = fileName.slice(lastDot + 1).trim();
  return ext ? ext.toUpperCase() : undefined;
}

/**
 * 把字节数格式化为副标题用的大小（B 为整数，KB 及以上两位小数，单位紧贴数字）。
 */
export function formatFileSize(byteSize: number): string | undefined {
  if (!Number.isFinite(byteSize) || byteSize < 0) return undefined;

  let value = byteSize;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < FILE_SIZE_UNITS.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  if (unitIndex === 0) return `${Math.round(value)}B`;
  return `${value.toFixed(2)}${FILE_SIZE_UNITS[unitIndex]}`;
}

/**
 * 拼副标题：类型与大小都有则为「MD 8.43KB」，缺一则只显示有的。
 */
export function formatFileMeta(fileName?: string, byteSize?: number): string | undefined {
  const type = getFileTypeLabel(fileName);
  const size = typeof byteSize === 'number' ? formatFileSize(byteSize) : undefined;
  if (type && size) return `${type} ${size}`;
  return type ?? size;
}

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
