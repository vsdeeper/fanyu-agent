#!/usr/bin/env node
/**
 * 将本地会话库 chats.db 的 WAL 合回主库（PRAGMA wal_checkpoint(TRUNCATE)）。
 * 用于关应用后仍残留 chats.db-wal / chats.db-shm、导致 sync:data 风险检测中止时。
 * 请先确认 pnpm dev / next 已退出，再运行本脚本。
 */
import { createRequire } from 'module';
import { existsSync, readFileSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');

const DEFAULT_LOCAL = './data/chats';

/** 读取 .env.local 中的键值（不覆盖已有 process.env） */
function loadEnvLocal() {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return {};
  const vars = {};
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

/** 解析本地会话资产目录（images/docs） */
function getLocalChatsDir() {
  const envLocal = loadEnvLocal();
  const raw = process.env.CHAT_STORE_DIR ?? envLocal.CHAT_STORE_DIR ?? DEFAULT_LOCAL;
  return resolve(process.cwd(), raw);
}

/** 会话库路径：CHAT_STORE_DIR 上一级 */
function getLocalChatsDbPath() {
  const chatsDir = getLocalChatsDir();
  const canonical = join(dirname(chatsDir), 'chats.db');
  const legacy = join(chatsDir, 'chats.db');
  if (existsSync(canonical)) return canonical;
  if (existsSync(legacy)) return legacy;
  return canonical;
}

/** 格式化文件大小 */
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 副档摘要；不存在则返回 null */
function describeSideFile(path) {
  if (!existsSync(path)) return null;
  const { size } = statSync(path);
  return `${path}（${formatSize(size)}）`;
}

function main() {
  const dbPath = getLocalChatsDbPath();
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;

  if (!existsSync(dbPath)) {
    console.error(`会话库不存在: ${dbPath}`);
    process.exit(1);
  }

  const walBefore = describeSideFile(walPath);
  const shmBefore = describeSideFile(shmPath);
  if (!walBefore && !shmBefore) {
    console.log(`无需 checkpoint：未发现 WAL 副档（${dbPath}）`);
    process.exit(0);
  }

  console.log('checkpoint 前：');
  if (walBefore) console.log(`  -wal: ${walBefore}`);
  if (shmBefore) console.log(`  -shm: ${shmBefore}`);

  let db;
  try {
    db = new Database(dbPath);
    // busy_timeout：偶发短暂占用时稍等，避免立刻 SQLITE_BUSY
    db.pragma('busy_timeout = 5000');
    const [row] = db.pragma('wal_checkpoint(TRUNCATE)');
    // better-sqlite3 返回 { busy, log, checkpointed }
    console.log(
      `checkpoint 结果: busy=${row.busy}, log=${row.log}, checkpointed=${row.checkpointed}`,
    );
    if (row.busy !== 0) {
      console.error(
        '库仍被占用（busy≠0），请确认已关闭 pnpm dev / next 后再重试；勿强杀 Cursor 自带的 tsserver node。',
      );
      process.exit(1);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`checkpoint 失败: ${message}`);
    if (/SQLITE_BUSY|database is locked/i.test(message)) {
      console.error('请先关闭占用会话库的应用进程后重试。');
    }
    process.exit(1);
  } finally {
    db?.close();
  }

  const walAfter = describeSideFile(walPath);
  const shmAfter = describeSideFile(shmPath);
  console.log('checkpoint 后：');
  console.log(`  -wal: ${walAfter ?? '已清除'}`);
  console.log(`  -shm: ${shmAfter ?? '已清除'}`);

  if (walAfter || shmAfter) {
    console.warn('副档仍在；若体积已为 0 通常可同步，否则请排查仍占用库的进程。');
    process.exit(1);
  }

  console.log('完成。可执行 pnpm sync:data:push / pull。');
}

main();
