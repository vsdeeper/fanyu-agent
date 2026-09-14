import 'server-only';

import { existsSync, mkdirSync, renameSync } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { requireEnv } from '@/lib/shared/server/env';
import { resolveChatsDbPath, resolveLegacyChatsDbPath } from './paths';
import * as schema from './schema';

export function getChatDir(): string {
  return requireEnv('CHAT_STORE_DIR');
}

function ensureChatDir(chatDir: string): void {
  if (!existsSync(chatDir)) {
    mkdirSync(chatDir, { recursive: true });
  }
}

/**
 * 将会话库放到 CHAT_STORE_DIR 上一级；若仅存在旧路径则整体改名迁过去（含 WAL 副档）。
 */
function relocateChatsDbIfNeeded(storeDir: string): string {
  const canonical = resolveChatsDbPath(storeDir);
  const legacy = resolveLegacyChatsDbPath(storeDir);
  if (!existsSync(canonical) && existsSync(legacy)) {
    mkdirSync(path.dirname(canonical), { recursive: true });
    for (const suffix of ['', '-wal', '-shm'] as const) {
      const from = `${legacy}${suffix}`;
      const to = `${canonical}${suffix}`;
      if (existsSync(from)) renameSync(from, to);
    }
  }
  mkdirSync(path.dirname(canonical), { recursive: true });
  return canonical;
}

type Db = BetterSQLite3Database<typeof schema>;

type GlobalDb = {
  __aiAgentSqlite?: Database.Database;
  __aiAgentDb?: Db;
  __aiAgentDbReady?: boolean;
};

function getGlobal(): GlobalDb {
  return globalThis as unknown as GlobalDb;
}

function createDb(): Db {
  const chatDir = path.resolve(getChatDir());
  ensureChatDir(chatDir);

  const dbPath = relocateChatsDbIfNeeded(chatDir);
  const sqlite = new Database(dbPath);
  // 修复：WAL 提升并发读；云盘会同步 -wal/-shm，换机前请先关应用以便 checkpoint
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });

  const g = getGlobal();
  g.__aiAgentSqlite = sqlite;
  g.__aiAgentDb = db;
  g.__aiAgentDbReady = true;
  return db;
}

/** 懒初始化：首次调用时建连并 migrate */
export function getDb(): Db {
  const g = getGlobal();
  if (g.__aiAgentDb && g.__aiAgentDbReady) {
    return g.__aiAgentDb;
  }
  return createDb();
}
