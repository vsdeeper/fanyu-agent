import { readFileSync } from 'fs';

import { getAsset, getAssetFilePath } from './assets';

/** 按 assetId 读取落盘图片并返回 HTTP Response；不存在或无效时返回 404 */
export function serveImageAsset(assetId: string): Response {
  const trimmed = assetId?.trim();
  if (!trimmed) {
    return new Response('Not Found', { status: 404 });
  }

  const asset = getAsset(trimmed);
  if (!asset) {
    return new Response('Not Found', { status: 404 });
  }

  const filePath = getAssetFilePath(asset);
  const bytes = readFileSync(filePath);

  return new Response(bytes, {
    status: 200,
    headers: {
      'Content-Type': asset.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
