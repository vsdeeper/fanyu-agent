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
