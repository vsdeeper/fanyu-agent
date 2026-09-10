#!/usr/bin/env node
/**
 * 手动镜像同步本地数据目录（会话 chats + 工作室 studio，本地 ↔ 云盘）。
 * push：CHAT_STORE_DIR 与同级 studio → CHAT_SYNC_REMOTE_DIR 与同级 studio
 * pull：CHAT_SYNC_REMOTE_DIR 与同级 studio → 本地
 * --yes：跳过 pull 确认与风险中止（风险清单仍会打印）
 */
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { createInterface } from 'readline';

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

/** 解析本地会话目录 */
function getLocalChatsDir() {
  const envLocal = loadEnvLocal();
  const raw = process.env.CHAT_STORE_DIR ?? envLocal.CHAT_STORE_DIR ?? DEFAULT_LOCAL;
  return resolve(process.cwd(), raw);
}

/** 解析云盘会话备份目录；必须配置 CHAT_SYNC_REMOTE_DIR，仓库不内置个人路径 */
function getRemoteChatsDir() {
  const envLocal = loadEnvLocal();
  const raw = (process.env.CHAT_SYNC_REMOTE_DIR ?? envLocal.CHAT_SYNC_REMOTE_DIR)?.trim();
  if (!raw) {
    console.error('未配置 CHAT_SYNC_REMOTE_DIR，请在 .env.local 中填写云盘备份路径');
    process.exit(1);
  }
  return resolve(raw);
}

/** 会话目录同级的工作室资产目录 */
function siblingStudioDir(chatsDir) {
  return join(dirname(chatsDir), 'studio');
}

/** 应用在跑时会话库带 WAL 副档；此时镜像等于在连接底下换库 */
function hasWal(dir) {
  return existsSync(join(dir, 'chats.db-wal')) || existsSync(join(dir, 'chats.db-shm'));
}

/** 会话库摘要（路径、修改时间、大小），供 pull 覆盖前核对两侧差异 */
function describeDb(dir) {
  const dbPath = join(dir, 'chats.db');
  if (!existsSync(dbPath)) return `${dbPath}（不存在）`;
  const stat = statSync(dbPath);
  return `${dbPath}（${stat.mtime.toLocaleString()}，${(stat.size / 1024 / 1024).toFixed(1)}MB）`;
}

/**
 * 收集本次同步的风险：DB 是会话与资产的引用方，库正在写入或资产目录缺失时同步，
 * 只会得到「有记录、无文件」的资产 404，且要到之后访问任务时才暴露。
 */
function collectSyncRisks({ direction, localChats, remoteChats, localStudio, remoteStudio }) {
  const risks = [];
  if (hasWal(localChats)) {
    risks.push(`本地会话库存在 chats.db-wal/shm（应用可能正在运行）: ${localChats}`);
  }
  if (direction === 'pull') {
    if (hasWal(remoteChats)) {
      risks.push(`云盘会话库存在 chats.db-wal/shm（上次未关闭应用就同步）: ${remoteChats}`);
    }
    if (!existsSync(remoteStudio)) {
      risks.push(
        `云盘缺少工作室资产目录 ${remoteStudio}：pull 会把本地 DB 换成远端版本，资产文件不会跟着回来，之后任务资产会 404`,
      );
    }
  }
  if (direction === 'push' && !existsSync(localStudio)) {
    risks.push(
      `本地缺少工作室资产目录 ${localStudio}：只备份 DB 会让对端出现「有记录、无文件」的资产 404`,
    );
  }
  return risks;
}

/** pull 前交互确认（--yes 跳过） */
function confirmPull(localChatsDir, localStudioDir) {
  if (process.argv.includes('--yes')) return Promise.resolve(true);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolveConfirm) => {
    rl.question(
      `pull 将覆盖本地 ${localChatsDir} 与 ${localStudioDir}，是否继续？(y/N) `,
      (answer) => {
        rl.close();
        resolveConfirm(/^y(es)?$/i.test(answer.trim()));
      },
    );
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

/** 将 src 镜像到 dest；源不存在时按 required 决定失败或跳过。 */
function mirror(src, dest, { required, label }) {
  if (!existsSync(src)) {
    if (required) {
      console.error(`源目录不存在: ${src}`);
      process.exit(1);
    }
    console.log(`跳过 ${label}：源目录不存在 ${src}`);
    return;
  }
  console.log(`镜像同步 ${label}: ${src} → ${dest}`);
  if (process.platform === 'win32') {
    mirrorWithRobocopy(src, dest);
  } else {
    mirrorWithFs(src, dest);
  }
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== '--yes');
  const direction = args[0];

  if (!direction || !['push', 'pull'].includes(direction)) {
    console.error('用法: node scripts/sync-data.mjs <push|pull> [--yes]');
    console.error('  push  本地 → 云盘（chats 与同级 studio）');
    console.error('  pull  云盘 → 本地（chats 与同级 studio）');
    console.error('  --yes 跳过确认与风险中止（检测到 WAL 或资产目录缺失时会默认中止）');
    process.exit(1);
  }

  const localChats = getLocalChatsDir();
  const remoteChats = getRemoteChatsDir();
  const localStudio = siblingStudioDir(localChats);
  const remoteStudio = siblingStudioDir(remoteChats);

  const risks = collectSyncRisks({
    direction,
    localChats,
    remoteChats,
    localStudio,
    remoteStudio,
  });
  if (risks.length > 0) {
    console.warn('⚠ 检测到同步风险：');
    for (const risk of risks) console.warn(`  - ${risk}`);
    if (!process.argv.includes('--yes')) {
      console.error('已中止，未改动任何数据。建议先关闭应用、确认资产目录齐备后重跑。');
      process.exit(1);
    }
    console.warn('已指定 --yes，按上述风险继续同步。');
  }

  if (direction === 'push') {
    mirror(localChats, remoteChats, { required: true, label: 'chats' });
    mirror(localStudio, remoteStudio, { required: false, label: 'studio' });
    console.log('同步完成。');
    return;
  }

  console.log(
    `即将从云盘拉取并覆盖本地: ${remoteChats} → ${localChats}，以及 ${remoteStudio} → ${localStudio}`,
  );
  console.log(`  云盘侧: ${describeDb(remoteChats)}`);
  console.log(`  本地侧: ${describeDb(localChats)}`);
  const ok = await confirmPull(localChats, localStudio);
  if (!ok) {
    console.log('已取消。');
    process.exit(0);
  }
  mirror(remoteChats, localChats, { required: true, label: 'chats' });
  mirror(remoteStudio, localStudio, { required: false, label: 'studio' });
  console.log('同步完成。');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
