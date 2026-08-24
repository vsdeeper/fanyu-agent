import 'server-only';

import { generateId, type UIMessage } from 'ai';
import { asc, desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db/client';
import { chats, messages } from '@/lib/db/schema';
import { DEFAULT_CHAT_TITLE } from '../constants';
import type { ChatListItem, ChatRecord } from '../types';

const TITLE_MAX_LENGTH = 30;

function getPartsText(message: UIMessage): string {
  if (!message.parts?.length) return '';
  return message.parts
    .filter((part) => part.type === 'text' && 'text' in part && typeof part.text === 'string')
    .map((part) => ('text' in part && typeof part.text === 'string' ? part.text : ''))
    .join('');
}

function deriveTitle(messagesList: UIMessage[]): string | undefined {
  const firstUser = messagesList.find((m) => m.role === 'user');
  if (!firstUser) return undefined;
  const text = getPartsText(firstUser).trim().replace(/\s+/g, ' ');
  if (!text) return undefined;
  return text.length > TITLE_MAX_LENGTH ? `${text.slice(0, TITLE_MAX_LENGTH)}…` : text;
}

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
  let title = previous?.title ?? DEFAULT_CHAT_TITLE;
  if (title === DEFAULT_CHAT_TITLE) {
    const derived = deriveTitle(nextMessages);
    if (derived) title = derived;
  }

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
        set: {
          title,
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

export async function listChats(): Promise<ChatListItem[]> {
  const db = getDb();
  const rows = db.select().from(chats).orderBy(desc(chats.updatedAt)).all();
  return rows.map((row) => ({
    id: row.id,
    title: row.title || DEFAULT_CHAT_TITLE,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
}

export async function deleteChat(id: string): Promise<void> {
  const db = getDb();
  db.delete(chats).where(eq(chats.id, id)).run();
}
