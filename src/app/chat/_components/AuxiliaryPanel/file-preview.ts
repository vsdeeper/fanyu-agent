/** 预览正文体积上限（字节）；超过则拒绝打开面板 */
export const FILE_PREVIEW_MAX_BYTES = 512 * 1024;

export const UNSUPPORTED_PREVIEW_MESSAGE = '暂不支持该类型预览';

export const UNAVAILABLE_PREVIEW_MESSAGE = '无法加载文件预览';

export const FILE_PREVIEW_TOO_LARGE_MESSAGE = '文件过大，无法预览';

/** 明确不可预览的 MIME（有此类 MIME 时不再用扩展名放行） */
export const REJECTED_PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'application/x-zip-compressed',
]);

/** 明确不可预览的 MIME 前缀 */
export const REJECTED_PREVIEW_MIME_PREFIXES = ['image/', 'video/', 'audio/'] as const;

/** 非 text/* 但仍按文本预览的 MIME（不含参数） */
export const PREVIEWABLE_MIME_TYPES = new Set([
  'application/json',
  'application/javascript',
  'application/typescript',
  'application/xml',
  'application/yaml',
  'application/x-yaml',
  'application/graphql',
]);

/** 无可靠 MIME 时按扩展名放行 */
export const PREVIEWABLE_EXTENSIONS = new Set([
  'md',
  'markdown',
  'mdx',
  'txt',
  'json',
  'ts',
  'tsx',
  'js',
  'jsx',
  'mjs',
  'cjs',
  'css',
  'scss',
  'less',
  'yml',
  'yaml',
  'html',
  'xml',
  'csv',
  'sh',
  'bash',
  'py',
  'go',
  'rs',
  'java',
  'kt',
  'sql',
  'toml',
  'ini',
  'graphql',
]);

/** 与 buildImageAssetUrl 对齐的 pathname：/api/images/{assetId} */
const IMAGE_ASSET_PATH_PATTERN = /^\/api\/images\/[A-Za-z0-9_-]+\/?$/;

/**
 * 从文件名取小写扩展名（无点）；无扩展名则不返回。
 */
export function getFileExtension(fileName?: string): string | undefined {
  if (!fileName) return undefined;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) return undefined;
  const ext = fileName
    .slice(lastDot + 1)
    .trim()
    .toLowerCase();
  return ext || undefined;
}

/**
 * 去掉 MIME 参数并转小写。
 */
export function normalizeMediaType(mediaType?: string): string | undefined {
  if (!mediaType) return undefined;
  const mime = mediaType.split(';')[0]?.trim().toLowerCase();
  return mime || undefined;
}

/**
 * 已知二进制 MIME 不可预览（不再被 .md 等扩展名盖过）。
 */
export function isRejectedPreviewMime(mime: string): boolean {
  if (REJECTED_PREVIEW_MIME_TYPES.has(mime)) return true;
  return REJECTED_PREVIEW_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix));
}

/**
 * 是否可用右侧面板预览（Markdown / 纯文本 / 常见代码）。
 */
export function isPreviewableFile(fileName?: string, mediaType?: string): boolean {
  const mime = normalizeMediaType(mediaType);
  if (mime) {
    if (mime.startsWith('text/') || PREVIEWABLE_MIME_TYPES.has(mime)) return true;
    if (isRejectedPreviewMime(mime)) return false;
  }
  const ext = getFileExtension(fileName);
  return ext !== undefined && PREVIEWABLE_EXTENSIONS.has(ext);
}

/**
 * 是否超过预览体积上限；未知体积视为未超限（交给加载后再拦）。
 */
export function isFileOverPreviewLimit(byteSize?: number): boolean {
  return typeof byteSize === 'number' && byteSize > FILE_PREVIEW_MAX_BYTES;
}

/**
 * 从 data URL 头估算原始字节数，不拷贝 payload。
 * base64 按 4→3 换算；其余用 payload 字符数作上限。
 */
export function estimateDataUrlBytes(url: string): number | undefined {
  if (!url.startsWith('data:')) return undefined;
  const comma = url.indexOf(',');
  if (comma < 0) return undefined;

  const meta = url.slice(0, comma);
  const payloadLength = url.length - comma - 1;
  if (payloadLength <= 0) return 0;
  if (!/;base64$/i.test(meta)) return payloadLength;

  const padding = url.endsWith('==') ? 2 : url.endsWith('=') ? 1 : 0;
  return Math.floor((payloadLength * 3) / 4) - padding;
}

/**
 * 预览面板 Markdown 图是否允许：同源且 pathname 为 /api/images/:assetId。
 * origin 缺省时用当前页面 origin（仅浏览器）。
 */
export function isAllowedPreviewImageSrc(src: string, origin?: string): boolean {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  if (!base) return false;

  try {
    const url = new URL(src, base);
    if (url.origin !== base) return false;
    return IMAGE_ASSET_PATH_PATTERN.test(url.pathname);
  } catch {
    return false;
  }
}
