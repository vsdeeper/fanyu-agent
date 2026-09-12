import 'server-only';

import type { BusinessAnalysisDocumentInput } from '@/app/api/studio/business-analysis/_shared/types';
import { MAX_STUDIO_DOCUMENT_BYTES } from '@/app/api/studio/_server/constants';
import { isAllowedStudioDocument } from './document-guard';

export type ExtractedStudioDocuments = {
  texts: string[];
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
 * 抽取产品资料：仅 txt/md 转 UTF-8。损坏或超限的条目跳过，不中断分析。
 */
export async function extractStudioDocuments(
  documents: BusinessAnalysisDocumentInput[] | undefined,
): Promise<ExtractedStudioDocuments> {
  const texts: string[] = [];
  if (!documents?.length) {
    return { texts };
  }

  for (const doc of documents) {
    if (!isAllowedStudioDocument(doc.filename, doc.mediaType)) continue;
    const label = doc.filename.trim() || '资料';
    let bytes: Buffer;
    try {
      bytes = decodeDataUrl(doc.dataUrl);
    } catch {
      continue;
    }
    if (bytes.length === 0 || bytes.length > MAX_STUDIO_DOCUMENT_BYTES) continue;

    try {
      texts.push(`附件「${label}」：\n${bytes.toString('utf-8')}`);
    } catch {
      continue;
    }
  }

  return { texts };
}

/**
 * 拼进用户 prompt 的产品资料段落；无文本时返回空串。
 *
 * 不能返回「（未上传产品资料…）」这类占位串：调用方要用返回值是否为空来决定要不要写
 * 「- 产品资料：」那一行，占位串会被当成一份空文档写进 prompt。判「有没有资料」看 `texts.length`。
 */
export function formatDocumentsPrompt(extracted: ExtractedStudioDocuments): string {
  return extracted.texts.join('\n\n');
}
