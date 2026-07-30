import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { generateId } from 'ai';
import { eq } from 'drizzle-orm';
import { getChatDir, getDb } from '@/lib/db/client';
import { chats, imageAssets } from '@/lib/db/schema';

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
}: {
  chatId: string;
  parentId: string | null;
  modelId: string;
  prompt: string;
  bytes: Uint8Array;
  mimeType: string;
}): Promise<ImageAssetRecord> {
  const id = generateId();
  const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpeg';
  const fileName = `${id}.${ext}`;
  const createdAt = new Date().toISOString();
  const dir = getChatImagesDir(chatId);

  writeFileSync(path.join(dir, fileName), bytes);

  const db = getDb();
  db.insert(imageAssets)
    .values({
      id,
      chatId,
      parentId,
      modelId,
      prompt,
      fileName,
      mimeType,
      createdAt,
    })
    .run();

  await setWorkingAsset(chatId, id);

  return {
    id,
    chatId,
    parentId,
    modelId,
    prompt,
    fileName,
    mimeType,
    createdAt,
  };
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
