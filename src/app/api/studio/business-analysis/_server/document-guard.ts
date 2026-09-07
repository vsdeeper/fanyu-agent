import 'server-only';

import { STUDIO_DOC_EXTS } from '@/app/api/studio/_server/constants';

/** 从文件名取小写扩展名 */
export function toDocumentExt(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';
  return filename
    .slice(lastDot + 1)
    .trim()
    .toLowerCase();
}

/** 是否为分析接口允许的产品资料（仅 txt / md） */
export function isAllowedStudioDocument(filename: string, mediaType?: string): boolean {
  if (mediaType === 'text/plain' || mediaType === 'text/markdown') return true;
  return (STUDIO_DOC_EXTS as readonly string[]).includes(toDocumentExt(filename));
}
