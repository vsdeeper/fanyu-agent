import 'server-only';

import type { BusinessAnalysisDocumentInput } from '@/app/api/studio/business-analysis/_shared/types';
import {
  decodeDataUrl,
  extractStudioDocuments,
  formatDocumentsPrompt,
} from '@/app/api/studio/business-analysis/_server/extract-documents';
import { MAX_STUDIO_DOCUMENT_BYTES } from '@/app/api/studio/_server/constants';
import type { StudioImageFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import { isImageTextPdfDocument } from './document-guard';

export type ImageTextPdfFilePart = StudioImageFilePart & {
  filename?: string;
};

/**
 * 拆分图文素材文件：TXT/MD 抽正文；PDF 解码为多模态 file part（模型直读）。
 * 损坏或超限的 PDF 记入 invalidPdfs，由调用方拒绝请求。
 */
export async function resolveImageTextDocuments(
  documents: BusinessAnalysisDocumentInput[] | undefined,
): Promise<{
  documentsText: string;
  pdfParts: ImageTextPdfFilePart[];
  invalidPdfs: boolean;
}> {
  if (!documents?.length) {
    return { documentsText: '', pdfParts: [], invalidPdfs: false };
  }

  const textDocs: BusinessAnalysisDocumentInput[] = [];
  const pdfDocs: BusinessAnalysisDocumentInput[] = [];
  for (const doc of documents) {
    if (isImageTextPdfDocument(doc.filename, doc.mediaType)) pdfDocs.push(doc);
    else textDocs.push(doc);
  }

  const extracted = await extractStudioDocuments(textDocs);
  const documentsText = extracted.texts.length > 0 ? formatDocumentsPrompt(extracted) : '';

  const pdfParts: ImageTextPdfFilePart[] = [];
  let invalidPdfs = false;
  for (const doc of pdfDocs) {
    let bytes: Buffer;
    try {
      bytes = decodeDataUrl(doc.dataUrl);
    } catch {
      invalidPdfs = true;
      continue;
    }
    if (bytes.length === 0 || bytes.length > MAX_STUDIO_DOCUMENT_BYTES) {
      invalidPdfs = true;
      continue;
    }
    pdfParts.push({
      type: 'file',
      data: bytes,
      mediaType: 'application/pdf',
      filename: doc.filename.trim() || undefined,
    });
  }

  return { documentsText, pdfParts, invalidPdfs };
}
