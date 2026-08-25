import 'server-only';

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { generateId } from 'ai';
import { getChatDir } from '@/lib/db/client';
import {
  DEFAULT_DESIGN_MD_FILENAME,
  DESIGN_MD_FILENAME_PATTERN,
  DESIGN_MD_MIME_TYPE,
  DOC_ID_PATTERN,
} from '../constants';
import type { DocAssetRecord } from '../types';

function getDocsRoot(): string {
  return path.join(path.resolve(getChatDir()), 'docs');
}

function getChatDocsDir(chatId: string): string {
  return path.join(getDocsRoot(), chatId);
}

function ensureChatDocsDir(chatId: string): string {
  const dir = getChatDocsDir(chatId);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** 校验 chatId / assetId，非法则视为不存在 */
export function isValidDocId(id: string): boolean {
  return DOC_ID_PATTERN.test(id);
}

/**
 * 把模型给出的下载文件名收成安全的 basename；非法时回退 DESIGN.md。
 */
export function resolveDesignMdFileName(fileName: string | undefined): string {
  const trimmed = fileName?.trim();
  if (!trimmed) return DEFAULT_DESIGN_MD_FILENAME;
  const base = path.basename(trimmed);
  return DESIGN_MD_FILENAME_PATTERN.test(base) ? base : DEFAULT_DESIGN_MD_FILENAME;
}

function getDocFilePath(chatId: string, assetId: string): string {
  return path.join(getChatDocsDir(chatId), `${assetId}.md`);
}

function getDocMetaPath(chatId: string, assetId: string): string {
  return path.join(getChatDocsDir(chatId), `${assetId}.meta.json`);
}

/**
 * 将 DESIGN.md 正文落盘，返回可供下载的资产记录。
 */
export function saveDesignDoc({
  chatId,
  content,
  fileName,
}: {
  chatId: string;
  content: string;
  fileName?: string;
}): DocAssetRecord {
  if (!isValidDocId(chatId)) {
    throw new Error('invalid chatId');
  }

  const id = generateId();
  const resolvedName = resolveDesignMdFileName(fileName);
  const dir = ensureChatDocsDir(chatId);
  const filePath = path.join(dir, `${id}.md`);
  const metaPath = path.join(dir, `${id}.meta.json`);

  writeFileSync(filePath, content, 'utf8');
  writeFileSync(metaPath, JSON.stringify({ fileName: resolvedName }), 'utf8');

  return {
    id,
    chatId,
    fileName: resolvedName,
    mimeType: DESIGN_MD_MIME_TYPE,
  };
}

function readMetaFileName(chatId: string, assetId: string): string {
  const metaPath = getDocMetaPath(chatId, assetId);
  if (!existsSync(metaPath)) return DEFAULT_DESIGN_MD_FILENAME;
  try {
    const parsed = JSON.parse(readFileSync(metaPath, 'utf8')) as { fileName?: unknown };
    return typeof parsed.fileName === 'string'
      ? resolveDesignMdFileName(parsed.fileName)
      : DEFAULT_DESIGN_MD_FILENAME;
  } catch {
    return DEFAULT_DESIGN_MD_FILENAME;
  }
}

/**
 * 按会话与资产 id 读取已落盘文档；不存在或 id 非法时返回 undefined。
 */
export function getDesignDoc(chatId: string, assetId: string): DocAssetRecord | undefined {
  if (!isValidDocId(chatId) || !isValidDocId(assetId)) return undefined;

  const root = path.resolve(getChatDocsDir(chatId));
  const filePath = path.resolve(getDocFilePath(chatId, assetId));
  const relative = path.relative(root, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  if (!existsSync(filePath)) return undefined;

  return {
    id: assetId,
    chatId,
    fileName: readMetaFileName(chatId, assetId),
    mimeType: DESIGN_MD_MIME_TYPE,
  };
}

export function getDesignDocFilePath(asset: Pick<DocAssetRecord, 'chatId' | 'id'>): string {
  return getDocFilePath(asset.chatId, asset.id);
}
