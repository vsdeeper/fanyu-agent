/**
 * 会话文档资产的下载路径（不含 origin）。
 */
export function buildDocAssetUrl(chatId: string, assetId: string): string {
  return `/api/docs/${encodeURIComponent(chatId)}/${encodeURIComponent(assetId)}`;
}

/** 与 buildDocAssetUrl 对齐的 pathname：/api/docs/{chatId}/{assetId} */
const DOC_ASSET_PATH_PATTERN = /^\/api\/docs\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/?$/;

/**
 * 是否为可预览/下载的会话文档地址：同源且 pathname 为 /api/docs/:chatId/:assetId。
 * origin 缺省时用当前页面 origin（仅浏览器）。
 */
export function isDocAssetHref(href: string, origin?: string): boolean {
  const base = origin ?? (typeof window !== 'undefined' ? window.location.origin : undefined);
  if (!base) return false;

  try {
    const url = new URL(href, base);
    if (url.origin !== base) return false;
    return DOC_ASSET_PATH_PATTERN.test(url.pathname);
  } catch {
    return false;
  }
}
