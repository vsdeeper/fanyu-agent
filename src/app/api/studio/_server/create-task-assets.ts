import 'server-only';

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { generateId } from 'ai';
import { and, eq } from 'drizzle-orm';
import {
  businessAnalysisTaskAssets,
  ecommerceTaskAssets,
  productModelTaskAssets,
  productRetouchTaskAssets,
} from '@/lib/db/schema';
import { getChatDir, getDb } from '@/lib/db/client';
import { rewriteLegacyStudioAssetUrls } from './rewrite-legacy-asset-urls';

export type StudioAssetsTable =
  | typeof ecommerceTaskAssets
  | typeof productModelTaskAssets
  | typeof productRetouchTaskAssets
  | typeof businessAnalysisTaskAssets;

export type StudioTaskAssetRecord = {
  id: string;
  taskId: string;
  stepKey: string;
  kind: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  createdAt: string;
};

export type CreateStudioTaskAssetsConfig = {
  assetsTable: StudioAssetsTable;
  diskSegment: string;
  apiPrefix: string;
};

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

/**
 * 创建工作室任务资产落盘：data URL 写盘、登记元数据、构造站内 URL。
 */
export function createTaskAssets(config: CreateStudioTaskAssetsConfig) {
  const { assetsTable } = config;

  /** 工作室资产根：与 CHAT_STORE_DIR 同级的 studio/{product}。 */
  function getTaskAssetsRoot(): string {
    return path.join(path.dirname(path.resolve(getChatDir())), 'studio', config.diskSegment);
  }

  function getTaskAssetDir(taskId: string): string {
    const directory = path.join(getTaskAssetsRoot(), taskId);
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    return directory;
  }

  /** 构造任务资产的稳定访问地址。 */
  function buildTaskAssetUrl(taskId: string, assetId: string): string {
    return `${config.apiPrefix}/tasks/${encodeURIComponent(taskId)}/assets/${encodeURIComponent(assetId)}`;
  }

  function saveTaskAsset(
    taskId: string,
    stepKey: string,
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
      .insert(assetsTable)
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

  /** 递归落盘步骤快照中的 data URL，并把旧 /api/{product}/ 资产 URL 改写为 /api/studio 前缀。 */
  function persistSnapshotAssets(
    taskId: string,
    stepKey: string,
    value: unknown,
    kind = 'snapshot',
    originalName?: string,
  ): unknown {
    if (typeof value === 'string') {
      return value.startsWith('data:')
        ? saveTaskAsset(taskId, stepKey, kind, value, originalName)
        : rewriteLegacyStudioAssetUrls(value);
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
  function getTaskAsset(taskId: string, assetId: string): StudioTaskAssetRecord | undefined {
    return getDb()
      .select()
      .from(assetsTable)
      .where(and(eq(assetsTable.taskId, taskId), eq(assetsTable.id, assetId)))
      .get();
  }

  /** 仅按资产 id 反查归属任务，供读取失败时区分「任务不匹配」与「记录不存在」。 */
  function findAssetTaskId(assetId: string): string | undefined {
    return getDb()
      .select({ taskId: assetsTable.taskId })
      .from(assetsTable)
      .where(eq(assetsTable.id, assetId))
      .get()?.taskId;
  }

  /** 读取任务资产文件字节。 */
  function readTaskAsset(asset: StudioTaskAssetRecord): Uint8Array {
    return new Uint8Array(
      readFileSync(path.join(getTaskAssetsRoot(), asset.taskId, asset.fileName)),
    );
  }

  /** 删除任务对应的全部资产文件。 */
  function removeTaskAssetDirectory(taskId: string): void {
    rmSync(path.join(getTaskAssetsRoot(), taskId), { recursive: true, force: true });
  }

  return {
    buildTaskAssetUrl,
    persistSnapshotAssets,
    getTaskAsset,
    findAssetTaskId,
    readTaskAsset,
    removeTaskAssetDirectory,
  };
}
