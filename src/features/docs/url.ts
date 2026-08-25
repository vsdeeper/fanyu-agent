/**
 * 会话文档资产的下载路径（不含 origin）。
 */
export function buildDocAssetUrl(chatId: string, assetId: string): string {
  return `/api/docs/${encodeURIComponent(chatId)}/${encodeURIComponent(assetId)}`;
}
