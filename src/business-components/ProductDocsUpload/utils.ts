import { createElement, type ReactNode } from 'react';
import { DOC_ICON_BY_EXT, PRODUCT_DOC_EXT_SET } from './constants';
import type { ProductDocUploadItem } from './types';

/** 取文件名小写扩展名；无扩展名返回空串。 */
export function toDocExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) return '';
  return fileName
    .slice(lastDot + 1)
    .trim()
    .toLowerCase();
}

/** 判断文件是否为产品资料允许的 txt / md。 */
export function isAllowedProductDoc(file: Pick<File, 'name' | 'type'>): boolean {
  const ext = toDocExt(file.name);
  if (PRODUCT_DOC_EXT_SET.has(ext)) return true;
  return file.type === 'text/plain' || file.type === 'text/markdown';
}

/** 按扩展名返回资料卡片图标。 */
export function toDocIcon(fileName: string): ReactNode {
  const ext = toDocExt(fileName);
  if (ext === 'md') return createElement(DOC_ICON_BY_EXT.md);
  if (ext === 'txt') return createElement(DOC_ICON_BY_EXT.txt);
  return createElement(DOC_ICON_BY_EXT.default);
}

/** 返回本地文件或历史资产的基础展示信息。 */
export function getProductDocDisplay(item: ProductDocUploadItem): {
  name: string;
  type: string;
  size: number;
} {
  return {
    name: item.file?.name ?? item.name ?? '产品资料',
    type: item.file?.type ?? item.mimeType ?? 'application/octet-stream',
    size: item.file?.size ?? item.size ?? 0,
  };
}
