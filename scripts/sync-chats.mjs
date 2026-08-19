#!/usr/bin/env node
/**
 * 手动镜像同步会话数据目录（本地 ↔ 云盘）。
 * push：CHAT_STORE_DIR → CHAT_SYNC_REMOTE_DIR
 * pull：CHAT_SYNC_REMOTE_DIR → CHAT_STORE_DIR
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'fs';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { createInterface } from 'readline';

const DEFAULT_LOCAL = './data/chats';
const DEFAULT_REMOTE = 'D:/华为云盘/ai-agent/chats';

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

/** 解析本地会话目录 */
function getLocalDir() {
  const envLocal = loadEnvLocal();
  const raw = process.env.CHAT_STORE_DIR ?? envLocal.CHAT_STORE_DIR ?? DEFAULT_LOCAL;
  return resolve(process.cwd(), raw);
}

/** 解析云盘备份目录 */
function getRemoteDir() {
  const envLocal = loadEnvLocal();
  const raw = process.env.CHAT_SYNC_REMOTE_DIR ?? envLocal.CHAT_SYNC_REMOTE_DIR ?? DEFAULT_REMOTE;
  return resolve(raw);
}

/** 若存在 WAL 文件则提示先关闭应用 */
function warnWal(dir) {
  const wal = join(dir, 'chats.db-wal');
  const shm = join(dir, 'chats.db-shm');
  if (existsSync(wal) || existsSync(shm)) {
    console.warn(`⚠ 检测到 ${dir} 下有 chats.db-wal/shm，建议先关闭应用再同步。`);
  }
}

/** pull 前交互确认（--yes 跳过） */
function confirmPull(localDir) {
  if (process.argv.includes('--yes')) return Promise.resolve(true);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveConfirm) => {
    rl.question(`pull 将覆盖本地 ${localDir}，是否继续？(y/N) `, (answer) => {
      rl.close();
      resolveConfirm(/^y(es)?$/i.test(answer.trim()));
    });
  });
}

/** Windows 下用 robocopy /MIR 镜像同步 */
function mirrorWithRobocopy(src, dest) {
  mkdirSync(dest, { recursive: true });
  const result = spawnSync(
    'robocopy',
    [src, dest, '/MIR', '/NFL', '/NDL', '/NJH', '/NJS', '/NC', '/NS', '/NP'],
    { shell: true, stdio: 'inherit' },
  );
  // robocopy 退出码 0–7 均表示成功
  if (result.status !== null && result.status >= 8) {
    process.exit(result.status);
  }
}

/** 非 Windows 平台：递归复制 + 删除目标多余项 */
function copyRecursive(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const fromPath = join(from, entry.name);
    const toPath = join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(fromPath, toPath);
    } else {
      cpSync(fromPath, toPath, { force: true });
    }
  }
}

function removeExtra(from, to) {
  if (!existsSync(to)) return;
  for (const entry of readdirSync(to, { withFileTypes: true })) {
    const fromPath = join(from, entry.name);
    const toPath = join(to, entry.name);
    if (!existsSync(fromPath)) {
      rmSync(toPath, { recursive: true, force: true });
    } else if (entry.isDirectory()) {
      removeExtra(fromPath, toPath);
    }
  }
}

function mirrorWithFs(src, dest) {
  mkdirSync(dest, { recursive: true });
  copyRecursive(src, dest);
  removeExtra(src, dest);
}

/** 将 src 镜像到 dest */
function mirror(src, dest) {
  if (!existsSync(src)) {
    console.error(`源目录不存在: ${src}`);
    process.exit(1);
  }
  console.log(`镜像同步: ${src} → ${dest}`);
  warnWal(src);
  warnWal(dest);
  if (process.platform === 'win32') {
    mirrorWithRobocopy(src, dest);
  } else {
    mirrorWithFs(src, dest);
  }
  console.log('同步完成。');
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--yes');
  const direction = args[0];

  if (!direction || !['push', 'pull'].includes(direction)) {
    console.error('用法: node scripts/sync-chats.mjs <push|pull> [--yes]');
    console.error('  push  本地 → 云盘');
    console.error('  pull  云盘 → 本地');
    process.exit(1);
  }

  const local = getLocalDir();
  const remote = getRemoteDir();

  if (direction === 'push') {
    mirror(local, remote);
    return;
  }

  console.log(`即将从云盘拉取并覆盖本地: ${remote} → ${local}`);
  const ok = await confirmPull(local);
  if (!ok) {
    console.log('已取消。');
    process.exit(0);
  }
  mirror(remote, local);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
