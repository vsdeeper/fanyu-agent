import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';

/** 仅允许安全会话 id，用于校验与清理旧 JSON 文件名 */
export const chatIdRegex = /^[A-Za-z0-9_-]+$/;

export function getChatDir(): string {
  const configured = process.env.CHAT_STORE_DIR?.trim();
  // 修复：勿默认落到仓库内；未配置时用计划约定的华为云盘路径，换机请改 CHAT_STORE_DIR
  return configured && configured.length > 0 ? configured : 'D:/华为云盘/ai-agent/chats';
}

function ensureChatDir(chatDir: string): void {
  if (!existsSync(chatDir)) {
    mkdirSync(chatDir, { recursive: true });
  }
}

/** 切换到 SQLite 后不再需要会话 JSON；删除同目录旧文件，避免侧栏/同步残留 */
function cleanupLegacyJsonFiles(chatDir: string): void {
  let files: string[];
  try {
    files = readdirSync(chatDir);
  } catch {
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const id = file.slice(0, -'.json'.length);
    if (!chatIdRegex.test(id)) continue;
    try {
      unlinkSync(path.join(chatDir, file));
    } catch {
      // 忽略单文件删除失败（占用中等），不阻断启动
    }
  }
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
  cleanupLegacyJsonFiles(chatDir);

  const dbPath = path.join(chatDir, 'chats.db');
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

/** 懒初始化：首次调用时建连、migrate、清理旧 JSON */
export function getDb(): Db {
  const g = getGlobal();
  if (g.__aiAgentDb && g.__aiAgentDbReady) {
    return g.__aiAgentDb;
  }
  return createDb();
}

export function assertValidChatId(id: string): void {
  if (!chatIdRegex.test(id)) {
    throw new Error('Invalid chat ID');
  }
}
