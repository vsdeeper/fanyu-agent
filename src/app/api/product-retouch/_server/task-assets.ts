import 'server-only';

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { generateId } from 'ai';
import { and, eq } from 'drizzle-orm';
import { getChatDir, getDb } from '@/lib/db/client';
import { productRetouchTaskAssets } from '@/lib/db/schema';
import type { ProductRetouchStepKey } from '../_shared/task-types';

type TaskAssetRecord = typeof productRetouchTaskAssets.$inferSelect;

function getTaskAssetsRoot(): string {
  return path.join(path.resolve(getChatDir()), 'product-retouch');
}

function getTaskAssetDir(taskId: string): string {
  const directory = path.join(getTaskAssetsRoot(), taskId);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  return directory;
}

function extensionForMimeType(mimeType: string): string {
  const subtype = mimeType.split('/')[1]?.split('+')[0]?.toLowerCase();
  if (!subtype) return 'bin';
  return subtype === 'jpeg' ? 'jpg' : subtype.replace(/[^a-z0-9]/g, '') || 'bin';
}

function decodeDataUrl(value: string): { mimeType: string; bytes: Uint8Array } | null {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(value);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const bytes = match[2]
    ? new Uint8Array(Buffer.from(match[3], 'base64'))
    : new TextEncoder().encode(decodeURIComponent(match[3]));
  return { mimeType, bytes };
}

/** 构造产品精修任务资产的稳定访问地址。 */
export function buildTaskAssetUrl(taskId: string, assetId: string): string {
  return `/api/product-retouch/tasks/${encodeURIComponent(taskId)}/assets/${encodeURIComponent(assetId)}`;
}

/** 将单个 data URL 写入任务目录并登记资产元数据。 */
function saveTaskAsset(
  taskId: string,
  stepKey: ProductRetouchStepKey,
  kind: string,
  dataUrl: string,
  originalName?: string,
): string {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return dataUrl;

  const id = generateId();
  const extension = extensionForMimeType(decoded.mimeType);
  const fileName = `${id}.${extension}`;
  const createdAt = new Date().toISOString();
  writeFileSync(path.join(getTaskAssetDir(taskId), fileName), decoded.bytes);
  getDb()
    .insert(productRetouchTaskAssets)
    .values({
      id,
      taskId,
      stepKey,
      kind,
      fileName,
      originalName: originalName || fileName,
      mimeType: decoded.mimeType,
      createdAt,
    })
    .run();
  return buildTaskAssetUrl(taskId, id);
}

/** 递归落盘步骤快照中的 data URL，并用站内资产 URL 替换原值。 */
export function persistSnapshotAssets(
  taskId: string,
  stepKey: ProductRetouchStepKey,
  value: unknown,
  kind = 'snapshot',
  originalName?: string,
): unknown {
  if (typeof value === 'string') {
    return value.startsWith('data:')
      ? saveTaskAsset(taskId, stepKey, kind, value, originalName)
      : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => persistSnapshotAssets(taskId, stepKey, item, kind));
  }
  if (!value || typeof value !== 'object') return value;

  const record = value as Record<string, unknown>;
  const name =
    typeof record.filename === 'string'
      ? record.filename
      : typeof record.name === 'string'
        ? record.name
        : originalName;
  return Object.fromEntries(
    Object.entries(record).map(([key, child]) => [
      key,
      persistSnapshotAssets(taskId, stepKey, child, key, name),
    ]),
  );
}

/** 查找属于指定任务的资产，防止跨任务读取。 */
export function getTaskAsset(taskId: string, assetId: string): TaskAssetRecord | undefined {
  return getDb()
    .select()
    .from(productRetouchTaskAssets)
    .where(
      and(eq(productRetouchTaskAssets.taskId, taskId), eq(productRetouchTaskAssets.id, assetId)),
    )
    .get();
}

/** 读取任务资产文件字节。 */
export function readTaskAsset(asset: TaskAssetRecord): Uint8Array {
  return new Uint8Array(readFileSync(path.join(getTaskAssetsRoot(), asset.taskId, asset.fileName)));
}

/** 删除任务对应的全部资产文件。 */
export function removeTaskAssetDirectory(taskId: string): void {
  rmSync(path.join(getTaskAssetsRoot(), taskId), { recursive: true, force: true });
}
