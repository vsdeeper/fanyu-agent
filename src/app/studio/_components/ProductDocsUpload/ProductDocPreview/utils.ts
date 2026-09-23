import type { ProductDocUploadItem } from '../types';
import { getProductDocDisplay, toDocExt } from '../utils';

export type ProductDocPreviewKind = 'markdown' | 'text' | 'unsupported';

const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx']);
const TEXT_EXTENSIONS = new Set(['txt']);

/** 判断资料文件正文应如何预览：MD / TXT 读正文，其余提示不支持。 */
export function getDocPreviewKind(item: ProductDocUploadItem): ProductDocPreviewKind {
  const display = getProductDocDisplay(item);
  const ext = toDocExt(display.name);
  if (MARKDOWN_EXTENSIONS.has(ext) || display.type === 'text/markdown') return 'markdown';
  if (TEXT_EXTENSIONS.has(ext) || display.type === 'text/plain') return 'text';
  return 'unsupported';
}

/**
 * 读取资料正文（MD / TXT 用）：本地 File 走 FileReader，历史资产按 previewUrl fetch。
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
