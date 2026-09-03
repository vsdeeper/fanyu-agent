import 'server-only';

import mammoth from 'mammoth';

import type { EcommerceDocumentInput } from '@/app/api/ecommerce/_shared/types';
import { DOCX_MEDIA_TYPE, MAX_STUDIO_DOCUMENT_BYTES, PDF_MEDIA_TYPE } from './constants';
import { isAllowedStudioDocument, isStudioDocumentImage, toDocumentExt } from './document-guard';

type MammothWithMarkdown = typeof mammoth & {
  convertToMarkdown: (
    input: { buffer: Buffer },
    options?: Record<string, unknown>,
  ) => Promise<{ value: string; messages: unknown[] }>;
};

export type ExtractedStudioDocuments = {
  texts: string[];
  pdfs: { filename: string; bytes: Buffer }[];
  images: { filename: string; dataUrl: string }[];
};

/**
 * 把 data URL 解码为 Buffer。
 * 前端 FileReader.readAsDataURL 产出 base64；非 base64 视为 percent-encoding 兜底。
 */
export function decodeDataUrl(url: string): Buffer {
  const comma = url.indexOf(',');
  if (comma < 0) return Buffer.from('');
  const meta = url.slice(0, comma);
  const data = url.slice(comma + 1);
  return meta.endsWith(';base64')
    ? Buffer.from(data, 'base64')
    : Buffer.from(decodeURIComponent(data), 'utf-8');
}

/**
 * 抽取产品资料：txt/md 转 UTF-8，docx 转 Markdown，pdf 留给主模型直读，图片另走识图。
 * 损坏或超限的条目跳过，不中断分析。
 */
export async function extractStudioDocuments(
  documents: EcommerceDocumentInput[] | undefined,
): Promise<ExtractedStudioDocuments> {
  const texts: string[] = [];
  const pdfs: { filename: string; bytes: Buffer }[] = [];
  const images: { filename: string; dataUrl: string }[] = [];
  if (!documents?.length) {
    return { texts, pdfs, images };
  }

  for (const doc of documents) {
    if (!isAllowedStudioDocument(doc.filename, doc.mediaType)) continue;
    const label = doc.filename.trim() || '资料';
    if (isStudioDocumentImage(doc.filename, doc.mediaType)) {
      if (!doc.dataUrl.startsWith('data:image/')) continue;
      images.push({ filename: label, dataUrl: doc.dataUrl });
      continue;
    }
    let bytes: Buffer;
    try {
      bytes = decodeDataUrl(doc.dataUrl);
    } catch {
      continue;
    }
    if (bytes.length === 0 || bytes.length > MAX_STUDIO_DOCUMENT_BYTES) continue;

    const ext = toDocumentExt(doc.filename);
    try {
      if (ext === 'pdf' || doc.mediaType === PDF_MEDIA_TYPE) {
        pdfs.push({ filename: label, bytes });
        continue;
      }
      if (ext === 'docx' || doc.mediaType === DOCX_MEDIA_TYPE) {
        const markdown = (
          await (mammoth as MammothWithMarkdown).convertToMarkdown({ buffer: bytes })
        ).value;
        texts.push(`附件「${label}」：\n${markdown}`);
        continue;
      }
      texts.push(`附件「${label}」：\n${bytes.toString('utf-8')}`);
    } catch {
      continue;
    }
  }

  return { texts, pdfs, images };
}

/** 拼进用户 prompt 的产品资料段落 */
export function formatDocumentsPrompt(extracted: ExtractedStudioDocuments): string {
  if (
    extracted.texts.length === 0 &&
    extracted.pdfs.length === 0 &&
    extracted.images.length === 0
  ) {
    return '（未上传产品资料，按识图推断）';
  }
  const parts = [...extracted.texts];
  if (extracted.pdfs.length > 0) {
    parts.push(`另有 ${extracted.pdfs.length} 份 PDF 已作为附件，请阅读。`);
  }
  if (extracted.images.length > 0 && !extracted.texts.some((text) => text.startsWith('资料图「'))) {
    parts.push(`另有 ${extracted.images.length} 张资料图，请结合产品图理解。`);
  }
  return parts.join('\n\n');
}
