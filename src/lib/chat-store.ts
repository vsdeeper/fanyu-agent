import { generateId, type UIMessage } from 'ai';
import { existsSync, mkdirSync } from 'fs';
import { readdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';

export const DEFAULT_CHAT_TITLE = '新对话';
const TITLE_MAX_LENGTH = 30;
/** 仅允许安全文件名片段，防止路径穿越 */
const chatIdRegex = /^[A-Za-z0-9_-]+$/;

export type ChatRecord = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: UIMessage[];
};

export type ChatListItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

function getChatDir(): string {
  const configured = process.env.CHAT_STORE_DIR?.trim();
  // 修复：勿默认落到仓库内；未配置时用计划约定的华为云盘路径，换机请改 CHAT_STORE_DIR
  return configured && configured.length > 0 ? configured : 'D:/华为云盘/ai-agent/chats';
}

function ensureChatDir(chatDir: string): void {
  if (!existsSync(chatDir)) {
    mkdirSync(chatDir, { recursive: true });
  }
}

function getChatFile(id: string): string {
  if (!chatIdRegex.test(id)) {
    throw new Error('Invalid chat ID');
  }

  const chatDir = path.resolve(getChatDir());
  ensureChatDir(chatDir);

  const chatFile = path.resolve(chatDir, `${id}.json`);
  // 修复：必须校验 resolve 后仍在根目录内，否则 id 形如合法字符组合也可能配合 sep 逃逸
  if (!chatFile.startsWith(`${chatDir}${path.sep}`)) {
    throw new Error('Invalid chat ID');
  }

  return chatFile;
}

function getPartsText(message: UIMessage): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && 'text' in part && typeof part.text === 'string')
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

function deriveTitle(messages: UIMessage[]): string | undefined {
  const firstUser = messages.find((m) => m.role === 'user');
  if (!firstUser) return undefined;
  const text = getPartsText(firstUser).trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text;
}

export async function createChat(): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();
  const record: ChatRecord = {
    id,
    title: DEFAULT_CHAT_TITLE,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  await writeFile(getChatFile(id), JSON.stringify(record, null, 2), 'utf8');
  return id;
}

export async function loadChat(id: string): Promise<ChatRecord> {
  const raw = await readFile(getChatFile(id), 'utf8');
  return JSON.parse(raw) as ChatRecord;
}

export async function chatExists(id: string): Promise<boolean> {
  try {
    return existsSync(getChatFile(id));
  } catch {
    return false;
  }
}

export async function saveChat({
  chatId,
  messages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  let previous: ChatRecord | undefined;
  try {
    previous = await loadChat(chatId);
  } catch {
    previous = undefined;
  }

  const now = new Date().toISOString();
  let title = previous?.title ?? DEFAULT_CHAT_TITLE;
  if (title === DEFAULT_CHAT_TITLE) {
    const derived = deriveTitle(messages);
    if (derived) title = derived;
  }

  const record: ChatRecord = {
    id: chatId,
    title,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    messages,
  };

  await writeFile(getChatFile(chatId), JSON.stringify(record, null, 2), 'utf8');
}

export async function listChats(): Promise<ChatListItem[]> {
  const chatDir = path.resolve(getChatDir());
  ensureChatDir(chatDir);

  const files = await readdir(chatDir);
  const items: ChatListItem[] = [];

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -'.json'.length);
    if (!chatIdRegex.test(id)) continue;

    try {
      const record = await loadChat(id);
      items.push({
        id: record.id,
        title: record.title || DEFAULT_CHAT_TITLE,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
      });
    } catch {
      // 跳过损坏或半写入文件
    }
  }

  items.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
  return items;
}

export async function deleteChat(id: string): Promise<void> {
  const file = getChatFile(id);
  if (!existsSync(file)) return;
  await unlink(file);
}
