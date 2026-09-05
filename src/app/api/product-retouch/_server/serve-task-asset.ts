import 'server-only';

import { getTaskAsset, readTaskAsset } from './task-assets';

/** 返回指定任务资产，任务与资产不匹配时按不存在处理。 */
export function serveProductRetouchTaskAsset(taskId: string, assetId: string): Response {
  const asset = getTaskAsset(taskId, assetId);
  if (!asset) return new Response('Not Found', { status: 404 });
  try {
    return new Response(Buffer.from(readTaskAsset(asset)), {
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.originalName)}"`,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[product-retouch-assets] read', error);
    return new Response('Not Found', { status: 404 });
  }
}
