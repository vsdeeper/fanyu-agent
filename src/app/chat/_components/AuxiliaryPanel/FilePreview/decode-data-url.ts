/**
 * 解码 data URL 为 UTF-8 文本。Worker 与 loadPreviewText 共用，勿与 Worker 入口互相 import。
 */
export function decodeDataUrlText(url: string): string {
  const comma = url.indexOf(',');
  if (comma < 0) throw new Error('invalid data url');

  const meta = url.slice(0, comma);
  const payload = url.slice(comma + 1);
  const isBase64 = /;base64$/i.test(meta);

  if (isBase64) {
    const binary = atob(payload);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  }

  return decodeURIComponent(payload);
}
