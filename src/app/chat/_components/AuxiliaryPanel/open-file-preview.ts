import 'client-only';

import { isDocAssetHref } from '@/app/api/docs/_shared/url';
import { getAntdMessage } from '@/lib/shared/client/antd-message';
import {
  estimateDataUrlBytes,
  FILE_PREVIEW_TOO_LARGE_MESSAGE,
  isFileOverPreviewLimit,
  isPreviewableFile,
  UNAVAILABLE_PREVIEW_MESSAGE,
  UNSUPPORTED_PREVIEW_MESSAGE,
} from './file-preview';
import type { AuxiliaryPanelFileSource } from './types';
import { useAuxiliaryPanelStore } from './store';

export type OpenFilePreviewOptions = {
  fileName: string;
  mediaType: string;
  href: string;
  byteSize?: number;
};

/**
 * 把 href 分成 data URL 与 http 预览源。
 */
export function resolvePreviewSource(href: string): AuxiliaryPanelFileSource {
  if (href.startsWith('data:')) return { kind: 'data-url', url: href };
  return { kind: 'http', href };
}

/**
 * 校验类型、体积、地址后再打开右侧预览；失败只 toast，不打开面板。
 */
export function openFilePreview(options: OpenFilePreviewOptions): void {
  if (!isPreviewableFile(options.fileName, options.mediaType)) {
    getAntdMessage().warning(UNSUPPORTED_PREVIEW_MESSAGE);
    return;
  }

  const byteSize =
    options.byteSize ??
    (options.href.startsWith('data:') ? estimateDataUrlBytes(options.href) : undefined);
  if (isFileOverPreviewLimit(byteSize)) {
    getAntdMessage().warning(FILE_PREVIEW_TOO_LARGE_MESSAGE);
    return;
  }

  const isDataUrl = options.href.startsWith('data:');
  if (!isDataUrl && !isDocAssetHref(options.href)) {
    getAntdMessage().warning(UNAVAILABLE_PREVIEW_MESSAGE);
    return;
  }

  useAuxiliaryPanelStore.getState().openPanel({
    type: 'file-preview',
    fileName: options.fileName.trim() || '',
    mediaType: options.mediaType,
    source: resolvePreviewSource(options.href),
  });
}
