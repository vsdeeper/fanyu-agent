import { createElement, type ReactNode } from 'react';
import { PRODUCT_DOC_EXT_SET, PRODUCT_DOC_IMAGE_EXT_SET } from '../../../constants';
import { DOC_ICON_BY_EXT } from './constants';

/** 取文件名小写扩展名；无扩展名返回空串 */
export function toDocExt(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) return '';
  return fileName
    .slice(lastDot + 1)
    .trim()
    .toLowerCase();
}

/** 是否为商业分析允许的资料类型（文档或图片） */
export function isAllowedProductDoc(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return PRODUCT_DOC_EXT_SET.has(toDocExt(file.name));
}

/** 资料项是否为图片，用于缩略图预览 */
export function isImageProductDoc(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  return PRODUCT_DOC_IMAGE_EXT_SET.has(toDocExt(file.name));
}

/** 按扩展名返回资料卡片图标 */
export function toDocIcon(fileName: string): ReactNode {
  const ext = toDocExt(fileName);
  if (ext === 'pdf') return createElement(DOC_ICON_BY_EXT.pdf);
  if (ext === 'docx') return createElement(DOC_ICON_BY_EXT.docx);
  if (ext === 'md') return createElement(DOC_ICON_BY_EXT.md);
  if (ext === 'txt') return createElement(DOC_ICON_BY_EXT.txt);
  if (PRODUCT_DOC_IMAGE_EXT_SET.has(ext)) return createElement(DOC_ICON_BY_EXT.image);
  return createElement(DOC_ICON_BY_EXT.default);
}
