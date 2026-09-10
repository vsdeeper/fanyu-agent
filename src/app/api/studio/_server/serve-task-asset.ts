import 'server-only';

import type { StudioTaskAssetRecord } from './create-task-assets';

/**
 * 返回指定任务资产，任务与资产不匹配或读盘失败时按不存在处理。
 *
 * 404 有三种成因（记录不存在 / URL 的 taskId 与资产归属不符 / 磁盘文件读不出来），
 * 三者响应完全一样，故各自打服务端日志，便于只凭日志定性而不用复现。
 */
export function serveTaskAsset(input: {
  taskId: string;
  assetId: string;
  getTaskAsset: (taskId: string, assetId: string) => StudioTaskAssetRecord | undefined;
  findAssetTaskId: (assetId: string) => string | undefined;
  readTaskAsset: (asset: StudioTaskAssetRecord) => Uint8Array;
  logTag: string;
}): Response {
  const asset = input.getTaskAsset(input.taskId, input.assetId);
  if (!asset) {
    const ownerTaskId = input.findAssetTaskId(input.assetId);
    console.error(
      `[${input.logTag}] not-found assetId=${input.assetId} taskId=${input.taskId}` +
        (ownerTaskId
          ? ` ownerTaskId=${ownerTaskId}（URL 的 taskId 与资产归属不符）`
          : '（资产记录不存在）'),
    );
    return new Response('Not Found', { status: 404 });
  }
  try {
    return new Response(Buffer.from(input.readTaskAsset(asset)), {
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.originalName)}"`,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    const missing = (error as NodeJS.ErrnoException | null)?.code === 'ENOENT';
    console.error(
      `[${input.logTag}] read-failed assetId=${asset.id} taskId=${asset.taskId} fileName=${asset.fileName}` +
        (missing ? '（磁盘缺文件，检查 studio 是否随云盘同步）' : ''),
      error,
    );
    return new Response('Not Found', { status: 404 });
  }
}
