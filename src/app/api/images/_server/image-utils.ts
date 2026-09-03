import 'server-only';

/** 透明出图时在出站 prompt 末尾追加 alpha 约束；落盘仍用调用方原始 prompt。 */
export const TRANSPARENT_PROMPT_SUFFIX = '透明背景，alpha 通道，无底色、无棋盘格、无阴影底板';

/**
 * 按文件头识别图片 MIME，避免上游 Content-Type 缺失或 b64 时误标为 jpeg。
 */
export function sniffImageMime(bytes: Uint8Array, fallback = 'image/jpeg'): string {
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return 'image/png';
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }
  return fallback;
}

export function decodeBase64Image(b64: string): Uint8Array {
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

/** 读取常见图片格式的像素尺寸；无法识别时返回 undefined，供服务端日志观测上游实际输出。 */
export function readImageDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  let offset = 2;
  while (offset + 4 < bytes.length) {
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return undefined;
    const length = (bytes[offset] << 8) + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) return undefined;
    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      return {
        height: (bytes[offset + 3] << 8) + bytes[offset + 4],
        width: (bytes[offset + 5] << 8) + bytes[offset + 6],
      };
    }
    offset += length;
  }
  return undefined;
}

export async function downloadImage(url: string): Promise<{ bytes: Uint8Array; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载生图结果失败: HTTP ${response.status}`);
  }
  const headerMime = response.headers.get('content-type')?.split(';')[0]?.trim();
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  return { bytes, mimeType: sniffImageMime(bytes, headerMime || 'image/jpeg') };
}

/** 出站 prompt：透明需求时追加 alpha 约束；落盘仍用调用方原始 prompt，upstream 改动不回流。 */
export function buildImagePrompt(prompt: string, transparent?: boolean): string {
  if (!transparent) return prompt;
  return `${prompt}\n${TRANSPARENT_PROMPT_SUFFIX}`;
}
