import 'server-only';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { generateId } from 'ai';
import { and, desc, eq } from 'drizzle-orm';
import { getChatDir, getDb } from '@/lib/db/client';
import { chats, imageAssets } from '@/lib/db/schema';

/** 用户上传（粘贴/拖拽）产品图落盘时的哨兵 modelId；区别于真实生图模型，供产品图检索与路由守卫用 */
export const PRODUCT_IMAGE_MODEL_ID = 'user-upload';

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
  /** 覆写随机文件名（如产品图按内容哈希落盘以便幂等复用）；缺省用随机 id 命名 */
  fileName?: string;
  /** 是否写回 working image；产品图桥接传 false，避免覆盖「最近一张生成图」 */
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

/** 本会话用户上传产品图（哨兵 modelId）列表，按时间倒序；供桥接回溯与把 id 提示给主模型 */
export function listProductImageAssets(chatId: string): ImageAssetRecord[] {
  const db = getDb();
  const rows = db
    .select()
    .from(imageAssets)
    .where(and(eq(imageAssets.chatId, chatId), eq(imageAssets.modelId, PRODUCT_IMAGE_MODEL_ID)))
    .orderBy(desc(imageAssets.createdAt))
    .all();
  return rows.map(rowToRecord);
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
