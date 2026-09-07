import 'server-only';

import type { StudioTaskAssetRecord } from './create-task-assets';

/**
 * 返回指定任务资产，任务与资产不匹配或读盘失败时按不存在处理。
 */
export function serveTaskAsset(input: {
  taskId: string;
  assetId: string;
  getTaskAsset: (taskId: string, assetId: string) => StudioTaskAssetRecord | undefined;
  readTaskAsset: (asset: StudioTaskAssetRecord) => Uint8Array;
  logTag: string;
}): Response {
  const asset = input.getTaskAsset(input.taskId, input.assetId);
  if (!asset) return new Response('Not Found', { status: 404 });
  try {
    return new Response(Buffer.from(input.readTaskAsset(asset)), {
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.originalName)}"`,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error(`[${input.logTag}] read`, error);
    return new Response('Not Found', { status: 404 });
  }
}
