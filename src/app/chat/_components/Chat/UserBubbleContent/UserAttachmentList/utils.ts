import { createElement, type ReactNode } from 'react';
import { openFilePreview } from '@/app/chat/_components/AuxiliaryPanel/open-file-preview';
import {
  estimateDataUrlBytes,
  isPreviewableFile,
} from '@/app/chat/_components/AuxiliaryPanel/file-preview';
import type { MessagePart } from '../utils';
import {
  ICON_BY_KIND,
  MARKDOWN_MEDIA_TYPES,
  PDF_MEDIA_TYPE,
  USER_FILE_FALLBACK_NAME,
  WORD_MEDIA_TYPES,
} from './constants';

export type UserFilePart = {
  type: 'file';
  url: string;
  mediaType: string;
  filename?: unknown;
};

export type UserFileIconKind = keyof typeof ICON_BY_KIND;

/**
 * 从消息 parts 中筛出带 url 与 mediaType 的文件附件，保持原顺序。
 */
export function getUserFileParts(parts: ReadonlyArray<MessagePart> | undefined): UserFilePart[] {
  return (parts ?? []).filter(
    (part): part is UserFilePart =>
      part.type === 'file' && typeof part.url === 'string' && typeof part.mediaType === 'string',
  );
}

/**
 * 是否为图片类附件（走缩略图预览而非文件卡）。
 */
export function isImageMediaType(mediaType: string): boolean {
  return mediaType.startsWith('image/');
}

/**
 * 附件下载地址：仅 data URL；其它形态不传给 FileCard。
 */
export function getUserFileHref(url: string): string | undefined {
  return url.startsWith('data:') ? url : undefined;
}

/**
 * 从 data URL 头推算原始字节数，不拷贝 payload。
 */
export function getUserFileByteSize(url: string): number | undefined {
  return estimateDataUrlBytes(url);
}

/**
 * 可预览附件才返回打开面板的回调；PDF 等不传 onPreview。
 */
export function bindUserFilePreview(
  fileName: string,
  mediaType: string,
  url: string,
): (() => void) | undefined {
  const href = getUserFileHref(url);
  if (!href || !isPreviewableFile(fileName, mediaType)) return undefined;
  const byteSize = getUserFileByteSize(url);
  return () => openFilePreview({ fileName, mediaType, href, byteSize });
}

/**
 * 附件展示名：有 filename 用其 trim 结果，否则「未知」。
 */
export function getUserFileName(part: UserFilePart): string {
  if (typeof part.filename === 'string' && part.filename.trim()) {
    return part.filename.trim();
  }
  return USER_FILE_FALLBACK_NAME;
}

/**
 * 列表 key：不用 data URL，避免大字符串参与协调。
 */
export function getUserFileKey(part: UserFilePart, index: number): string {
  const name = typeof part.filename === 'string' ? part.filename : '';
  return `${part.mediaType}-${name}-${index}`;
}

/**
 * 按 mediaType 归类文件卡图标种类。
 */
export function getUserFileIconKind(mediaType: string): UserFileIconKind {
  if (mediaType === PDF_MEDIA_TYPE) return 'pdf';
  if (WORD_MEDIA_TYPES.has(mediaType)) return 'word';
  if (MARKDOWN_MEDIA_TYPES.has(mediaType)) return 'markdown';
  return 'default';
}

/**
 * 按 mediaType 返回文件卡图标节点。
 */
export function getUserFileIcon(mediaType: string): ReactNode {
  return createElement(ICON_BY_KIND[getUserFileIconKind(mediaType)]);
}
