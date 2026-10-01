import 'server-only';

import { toDocumentExt } from '@/app/api/studio/business-analysis/_server/document-guard';

const IMAGE_TEXT_DOC_EXTS = new Set(['txt', 'md', 'pdf']);

/** 图文内容步允许的素材文件：TXT / MD（进正文）与 PDF（多模态直读）。 */
export function isAllowedImageTextDocument(filename: string, mediaType?: string): boolean {
  if (
    mediaType === 'text/plain' ||
    mediaType === 'text/markdown' ||
    mediaType === 'application/pdf'
  ) {
    return true;
  }
  return IMAGE_TEXT_DOC_EXTS.has(toDocumentExt(filename));
}

/** 是否为应以内联 file part 交给模型的 PDF。 */
export function isImageTextPdfDocument(filename: string, mediaType?: string): boolean {
  return mediaType === 'application/pdf' || toDocumentExt(filename) === 'pdf';
}
