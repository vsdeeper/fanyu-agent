import type { ProductDocUploadItem } from '../types';
import { getProductDocDisplay, toDocExt } from '../utils';

export type ProductDocPreviewKind = 'markdown' | 'text' | 'pdf' | 'docx' | 'image' | 'unsupported';

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx']);
const TEXT_EXTENSIONS = new Set(['txt']);
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif']);

/** 判断资料文件正文应如何预览：MD / TXT 读正文，PDF 内嵌，图片放大，其余提示下载。 */
export function getDocPreviewKind(item: ProductDocUploadItem): ProductDocPreviewKind {
  const display = getProductDocDisplay(item);
  const ext = toDocExt(display.name);
  if (display.type.startsWith('image/') || IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (MARKDOWN_EXTENSIONS.has(ext)) return 'markdown';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  return 'unsupported';
}

/**
 * 读取资料正文（MD / TXT 用）：本地 File 走 FileReader，历史资产按 previewUrl fetch。
 * 都会走 readAsText，避免把大文件正文放进主线程 base64 解码。
 */
export async function loadDocText(
  item: ProductDocUploadItem,
  signal?: AbortSignal,
): Promise<string> {
  if (item.file) return readFileText(item.file, signal);
  const response = await fetch(item.previewUrl, { signal });
  if (!response.ok) throw new Error('fetch failed');
  return readFileText(await response.blob(), signal);
}

function readFileText(file: Blob, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (signal?.aborted) return;
      resolve(String(reader.result));
    };
    reader.onerror = () => {
      if (signal?.aborted) return;
      reject(reader.error ?? new Error('读取正文失败'));
    };
    signal?.addEventListener('abort', () => reader.abort());
    reader.readAsText(file);
  });
}
