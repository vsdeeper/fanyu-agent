import type { AuxiliaryPanelFileSource } from '../types';
import { FILE_PREVIEW_MAX_BYTES, getFileExtension, normalizeMediaType } from '../file-preview';
import { isDocAssetHref } from '@/app/api/docs/_shared/url';
import { MARKDOWN_EXTENSIONS, MARKDOWN_MEDIA_TYPES } from './constants';
import { decodeDataUrlText } from './decode-data-url';

export { decodeDataUrlText };

/**
 * 是否按 Markdown 渲染（其余可预览类型走纯文本 pre）。
 */
export function isMarkdownPreview(fileName: string, mediaType: string): boolean {
  const mime = normalizeMediaType(mediaType);
  if (mime && MARKDOWN_MEDIA_TYPES.has(mime)) return true;
  const ext = getFileExtension(fileName);
  return ext !== undefined && MARKDOWN_EXTENSIONS.has(ext);
}

let decodeWorker: Worker | null = null;
let decodeSeq = 0;
let pendingDecodes = 0;

/** 模块级复用 Worker，避免每次预览都新建线程 */
function getDecodeWorker(): Worker {
  if (!decodeWorker) {
    decodeWorker = new Worker(new URL('./decode.worker.ts', import.meta.url), { type: 'module' });
  }
  return decodeWorker;
}

/**
 * pending 归零时 terminate，避免长会话留下死线程。
 */
function releaseDecode(worker: Worker): void {
  pendingDecodes -= 1;
  if (pendingDecodes > 0) return;
  pendingDecodes = 0;
  worker.terminate();
  if (decodeWorker === worker) decodeWorker = null;
}

/**
 * 在 Worker 中解码 data URL 正文，避免主线程 atob 大文件。
 */
export function decodeDataUrlInWorker(url: string, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const id = String((decodeSeq += 1));
    const worker = getDecodeWorker();
    pendingDecodes += 1;
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      worker.removeEventListener('message', onMessage);
      worker.removeEventListener('error', onError);
      signal?.removeEventListener('abort', onAbort);
      releaseDecode(worker);
    };

    const onMessage = (event: MessageEvent<{ id: string; ok: boolean; text?: string }>) => {
      if (event.data.id !== id) return;
      cleanup();
      if (event.data.ok && typeof event.data.text === 'string') {
        resolve(event.data.text);
        return;
      }
      reject(new Error('decode failed'));
    };

    const onError = () => {
      cleanup();
      reject(new Error('decode worker error'));
    };

    const onAbort = () => {
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };

    worker.addEventListener('message', onMessage);
    worker.addEventListener('error', onError);
    signal?.addEventListener('abort', onAbort);
    worker.postMessage({ id, url });
  });
}

/**
 * 按来源读取预览正文。http 仅允许同源文档资产，并限制体积。
 */
export async function loadPreviewText(
  source: AuxiliaryPanelFileSource,
  signal?: AbortSignal,
): Promise<string> {
  if (source.kind === 'data-url') {
    return decodeDataUrlInWorker(source.url, signal);
  }

  if (!isDocAssetHref(source.href)) {
    throw new Error('href not allowed');
  }

  const response = await fetch(source.href, { signal });
  if (!response.ok) throw new Error('fetch failed');

  const contentLength = response.headers.get('content-length');
  if (contentLength) {
    const length = Number(contentLength);
    if (Number.isFinite(length) && length > FILE_PREVIEW_MAX_BYTES) {
      throw new Error('too large');
    }
  }

  const blob = await response.blob();
  if (blob.size > FILE_PREVIEW_MAX_BYTES) throw new Error('too large');
  return blob.text();
}
