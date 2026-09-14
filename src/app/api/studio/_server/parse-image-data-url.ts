import 'server-only';

/** 多模态 user content 中的图片 file part（AI SDK FilePart） */
export type StudioImageFilePart = {
  type: 'file';
  data: Buffer;
  mediaType: string;
};

/**
 * 把 data:image/... URL 解码为 streamText 可用的 file part。
 * 支持 base64 与 percent-encoding；格式非法时返回 null。
 */
export function parseImageDataUrlToFilePart(dataUrl: string): StudioImageFilePart | null {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) return null;
  const meta = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const mimeMatch = /^data:([^;]+)/.exec(meta);
  if (!mimeMatch?.[1]?.startsWith('image/')) return null;
  try {
    const bytes = meta.endsWith(';base64')
      ? Buffer.from(data, 'base64')
      : Buffer.from(decodeURIComponent(data), 'utf-8');
    return { type: 'file', data: bytes, mediaType: mimeMatch[1] };
  } catch {
    return null;
  }
}
