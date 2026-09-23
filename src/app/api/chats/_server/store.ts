import 'server-only';

import { cache } from 'react';
import { generateId, type UIMessage } from 'ai';
import { and, asc, desc, eq, gte, inArray, like, lte, type SQL } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { chats, messages } from '@/lib/db/schema';
import { DEFAULT_CHAT_TITLE } from './constants';
import { removeChatStoreDirectories } from './remove-chat-files';
import { deriveHeuristicTitle, getFirstUserText } from '@/app/api/chat/_server/title';
import type { ChatListItem, ChatRecord } from '../_shared/types';

export async function createChat(): Promise<string> {
  const id = generateId();
  const now = new Date().toISOString();
  const db = getDb();
  db.insert(chats)
    .values({
      id,
      title: DEFAULT_CHAT_TITLE,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

export async function loadChat(id: string): Promise<ChatRecord> {
  const db = getDb();
  const chat = db.select().from(chats).where(eq(chats.id, id)).get();
  if (!chat) {
    throw new Error('会话不存在');
  }

  const rows = db
    .select()
    .from(messages)
    .where(eq(messages.chatId, id))
    .orderBy(asc(messages.ord))
    .all();

  return {
    id: chat.id,
    title: chat.title,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messages: rows.map((row) => JSON.parse(row.data) as UIMessage),
  };
}

export async function chatExists(id: string): Promise<boolean> {
  const db = getDb();
  const row = db.select({ id: chats.id }).from(chats).where(eq(chats.id, id)).get();
  return Boolean(row);
}

export async function saveChat({
  chatId,
  messages: nextMessages,
}: {
  chatId: string;
  messages: UIMessage[];
}): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();

  const previous = db.select().from(chats).where(eq(chats.id, chatId)).get();
  const isDefaultTitle = !previous || previous.title === DEFAULT_CHAT_TITLE;
  let title = previous?.title ?? DEFAULT_CHAT_TITLE;
  if (isDefaultTitle) {
    const derived = deriveHeuristicTitle(getFirstUserText(nextMessages));
    if (derived) title = derived;
  }
  // 已有非默认标题时不回写 title，避免覆盖并行的 LLM 摘要结果
  const shouldWriteTitle = isDefaultTitle && title !== DEFAULT_CHAT_TITLE;

  const createdAt = previous?.createdAt ?? now;

  db.transaction((tx) => {
    tx.insert(chats)
      .values({
        id: chatId,
        title,
        createdAt,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: chats.id,
        set: shouldWriteTitle
          ? {
              title,
              updatedAt: now,
            }
          : {
              updatedAt: now,
            },
      })
      .run();

    tx.delete(messages).where(eq(messages.chatId, chatId)).run();

    if (nextMessages.length === 0) return;

    tx.insert(messages)
      .values(
        nextMessages.map((message, index) => ({
          id: message.id,
          chatId,
          role: message.role,
          ord: index,
          data: JSON.stringify(message),
        })),
      )
      .run();
  });
}

/** 侧栏会话列表（按更新时间倒序）。React.cache 去重同请求内根 layout 与会话 layout 的重复查询 */
export const listChats = cache(async function listChats(): Promise<ChatListItem[]> {
  const db = getDb();
  const rows = db.select().from(chats).orderBy(desc(chats.updatedAt)).all();
  return rows.map((row) => ({
    id: row.id,
    title: row.title || DEFAULT_CHAT_TITLE,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
});

export type QueryChatsFilters = {
  title?: string;
  createdFrom?: string;
  createdTo?: string;
};

/** 对话管理列表：按标题与创建日期筛选，创建时间倒序全量返回。 */
export async function queryChats(filters: QueryChatsFilters = {}): Promise<ChatListItem[]> {
  const db = getDb();
  const conditions: SQL[] = [];

  if (filters.title) {
    conditions.push(like(chats.title, `%${filters.title}%`));
  }
  if (filters.createdFrom) {
    conditions.push(gte(chats.createdAt, filters.createdFrom));
  }
  if (filters.createdTo) {
    conditions.push(lte(chats.createdAt, filters.createdTo));
  }

  const rows =
    conditions.length > 0
      ? db
          .select()
          .from(chats)
          .where(and(...conditions))
          .orderBy(desc(chats.createdAt))
          .all()
      : db.select().from(chats).orderBy(desc(chats.createdAt)).all();

  return rows.map((row) => ({
    id: row.id,
    title: row.title || DEFAULT_CHAT_TITLE,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

/** 仅更新会话标题，不碰消息、不刷新 updatedAt（避免侧栏因改标题而重排） */
export async function updateChatTitle(chatId: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  const db = getDb();
  db.update(chats).set({ title: trimmed }).where(eq(chats.id, chatId)).run();
}

export async function deleteChat(id: string): Promise<void> {
  const db = getDb();
  db.delete(chats).where(eq(chats.id, id)).run();
  // DB cascade 已清 messages / image_assets；再删会话图片与文档目录
  removeChatStoreDirectories(id);
}

/** 批量删除会话，返回实际删除条数。 */
export async function deleteChats(ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const db = getDb();
  const result = db.delete(chats).where(inArray(chats.id, ids)).run();
  for (const id of ids) {
    removeChatStoreDirectories(id);
  }
  return result.changes;
}
