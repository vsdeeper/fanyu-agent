import 'server-only';

import { STUDIO_DOC_EXTS, STUDIO_DOC_IMAGE_EXTS } from './constants';

/** 从文件名取小写扩展名 */
export function toDocumentExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';
  return filename
    .slice(lastDot + 1)
    .trim()
    .toLowerCase();
}

/** 是否为产品资料中的图片 */
export function isStudioDocumentImage(filename: string, mediaType?: string): boolean {
  if (mediaType?.startsWith('image/')) return true;
  return (STUDIO_DOC_IMAGE_EXTS as readonly string[]).includes(toDocumentExt(filename));
}

/** 是否为分析接口允许的产品资料（文档或图片） */
export function isAllowedStudioDocument(filename: string, mediaType?: string): boolean {
  if (isStudioDocumentImage(filename, mediaType)) return true;
  return (STUDIO_DOC_EXTS as readonly string[]).includes(toDocumentExt(filename));
}
