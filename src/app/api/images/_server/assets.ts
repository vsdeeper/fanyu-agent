import 'server-only';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { generateId } from 'ai';
import { and, desc, eq } from 'drizzle-orm';
import { getChatDir, getDb } from '@/lib/db/client';
import { chats, imageAssets } from '@/lib/db/schema';

/** 电商用户上传产品图落盘时的哨兵 modelId；不是真实生图模型 */
export const USER_PRODUCT_MODEL_ID = 'user-product';
/** 电商用户上传设计参考图落盘时的哨兵 modelId；不是真实生图模型 */
export const USER_REFERENCE_MODEL_ID = 'user-reference';

const USER_UPLOAD_SENTINEL_MODEL_IDS = new Set([USER_PRODUCT_MODEL_ID, USER_REFERENCE_MODEL_ID]);

/** 是否为用户上传哨兵（产品图/参考图）；用于跳过模型继承，避免当真实生图模型 */
export function isUserUploadSentinelModelId(modelId: string | undefined): boolean {
  const trimmed = modelId?.trim();
  return Boolean(trimmed && USER_UPLOAD_SENTINEL_MODEL_IDS.has(trimmed));
}

export type ImageAssetRecord = {
  id: string;
  chatId: string;
  parentId: string | null;
  modelId: string;
  prompt: string;
  fileName: string;
  mimeType: string;
  createdAt: string;
};

function getImagesRoot(): string {
  return path.join(path.resolve(getChatDir()), 'images');
}

function getChatImagesDir(chatId: string): string {
  const dir = path.join(getImagesRoot(), chatId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function rowToRecord(row: typeof imageAssets.$inferSelect): ImageAssetRecord {
  return {
    id: row.id,
    chatId: row.chatId,
    parentId: row.parentId,
    modelId: row.modelId,
    prompt: row.prompt,
    fileName: row.fileName,
    mimeType: row.mimeType,
    createdAt: row.createdAt,
  };
}

export function getAssetFilePath(asset: Pick<ImageAssetRecord, 'chatId' | 'fileName'>): string {
  return path.join(getImagesRoot(), asset.chatId, asset.fileName);
}

export function buildImageAssetUrl(assetId: string): string {
  return `/api/images/${assetId}`;
}

export async function saveImageAsset({
  chatId,
  parentId,
  modelId,
  prompt,
  bytes,
  mimeType,
  fileName,
  setWorking = true,
}: {
  chatId: string;
  parentId: string | null;
  modelId: string;
  prompt: string;
  bytes: Uint8Array;
  mimeType: string;
  /** 覆写随机文件名（如用户上传图按内容哈希落盘以便幂等复用）；缺省用随机 id 命名 */
  fileName?: string;
  /** 是否写回 working image；用户上传图桥接传 false，避免覆盖「最近一张生成图」 */
  setWorking?: boolean;
}): Promise<ImageAssetRecord> {
  const id = generateId();
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpeg';
  const resolvedFileName = fileName ?? `${id}.${ext}`;
  const createdAt = new Date().toISOString();
  const dir = getChatImagesDir(chatId);

  writeFileSync(path.join(dir, resolvedFileName), bytes);

  const db = getDb();
  db.insert(imageAssets)
    .values({
      id,
      chatId,
      parentId,
      modelId,
      prompt,
      fileName: resolvedFileName,
      mimeType,
      createdAt,
    })
    .run();

  if (setWorking) {
    await setWorkingAsset(chatId, id);
  }

  return {
    id,
    chatId,
    parentId,
    modelId,
    prompt,
    fileName: resolvedFileName,
    mimeType,
    createdAt,
  };
}

/** 按哨兵 modelId 列出本会话用户上传图，时间倒序 */
export function listUserUploadAssets(
  chatId: string,
  modelId: typeof USER_PRODUCT_MODEL_ID | typeof USER_REFERENCE_MODEL_ID,
): ImageAssetRecord[] {
  const db = getDb();
  const rows = db
    .select()
    .from(imageAssets)
    .where(and(eq(imageAssets.chatId, chatId), eq(imageAssets.modelId, modelId)))
    .orderBy(desc(imageAssets.createdAt))
    .all();
  return rows.map(rowToRecord);
}

/** 本会话已登记产品图（user-product），按时间倒序 */
export function listProductImageAssets(chatId: string): ImageAssetRecord[] {
  return listUserUploadAssets(chatId, USER_PRODUCT_MODEL_ID);
}

/** 本会话已登记设计参考图（user-reference），按时间倒序 */
export function listReferenceImageAssets(chatId: string): ImageAssetRecord[] {
  return listUserUploadAssets(chatId, USER_REFERENCE_MODEL_ID);
}

/** 按 (chatId, fileName) 查已落盘资产；供上传图幂等复用 */
export function findAssetByFileName(
  chatId: string,
  fileName: string,
): ImageAssetRecord | undefined {
  const db = getDb();
  const row = db
    .select()
    .from(imageAssets)
    .where(and(eq(imageAssets.chatId, chatId), eq(imageAssets.fileName, fileName)))
    .get();
  return row ? rowToRecord(row) : undefined;
}

export function getAsset(id: string): ImageAssetRecord | undefined {
  const db = getDb();
  const row = db.select().from(imageAssets).where(eq(imageAssets.id, id)).get();
  return row ? rowToRecord(row) : undefined;
}

export function readAssetBytes(asset: ImageAssetRecord): Uint8Array {
  const filePath = getAssetFilePath(asset);
  return new Uint8Array(readFileSync(filePath));
}

export function assetToDataUrl(asset: ImageAssetRecord): string {
  const bytes = readAssetBytes(asset);
  const base64 = Buffer.from(bytes).toString('base64');
  return `data:${asset.mimeType};base64,${base64}`;
}

export async function getWorkingAsset(chatId: string): Promise<ImageAssetRecord | undefined> {
  const db = getDb();
  const chat = db.select().from(chats).where(eq(chats.id, chatId)).get();
  if (!chat?.workingImageAssetId) return undefined;
  return getAsset(chat.workingImageAssetId);
}

export async function setWorkingAsset(chatId: string, assetId: string): Promise<void> {
  const db = getDb();
  db.update(chats).set({ workingImageAssetId: assetId }).where(eq(chats.id, chatId)).run();
}

export function resolveParentModelId(parentId: string | null): string | undefined {
  if (!parentId) return undefined;
  return getAsset(parentId)?.modelId;
}
