import 'server-only';

import type { BusinessAnalysisDocumentInput } from '@/app/api/studio/business-analysis/_shared/types';
import {
  decodeDataUrl,
  extractStudioDocuments,
  formatDocumentsPrompt,
} from '@/app/api/studio/business-analysis/_server/extract-documents';
import { MAX_STUDIO_DOCUMENT_BYTES } from '@/app/api/studio/_server/constants';
import type { StudioImageFilePart } from '@/app/api/studio/_server/parse-image-data-url';
import { isNovelIdeaPdf } from '../_shared/idea-file';
import type { NovelIdeaFile } from '../_shared/types';

export type NovelIdeaPdfPart = StudioImageFilePart & {
  filename?: string;
};

export type ResolvedNovelIdeaFile = {
  documentsText: string;
  pdfPart?: NovelIdeaPdfPart;
};

/**
 * 拆分思路文件：TXT/MD 抽正文；PDF 解码为多模态 file part。
 * 未上传时返回空正文。损坏、空白或超限视为失败，由调用方拒绝请求。
 */
export async function resolveNovelIdeaFile(
  file: NovelIdeaFile | undefined,
): Promise<({ ok: true } & ResolvedNovelIdeaFile) | { ok: false }> {
  if (!file) return { ok: true, documentsText: '' };

  if (isNovelIdeaPdf(file.filename, file.mediaType)) {
    let bytes: Buffer;
    try {
      bytes = decodeDataUrl(file.dataUrl);
    } catch {
      return { ok: false };
    }
    if (bytes.length === 0 || bytes.length > MAX_STUDIO_DOCUMENT_BYTES) return { ok: false };
    return {
      ok: true,
      documentsText: '',
      pdfPart: {
        type: 'file',
        data: bytes,
        mediaType: 'application/pdf',
        filename: file.filename.trim() || undefined,
      },
    };
  }

  const input: BusinessAnalysisDocumentInput = {
    filename: file.filename,
    mediaType: file.mediaType,
    dataUrl: file.dataUrl,
  };
  const extracted = await extractStudioDocuments([input]);
  const documentsText = formatDocumentsPrompt(extracted).trim();
  if (!documentsText) return { ok: false };
  return { ok: true, documentsText };
}
