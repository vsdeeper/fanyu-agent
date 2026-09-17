import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * 将 `.env.local` 中尚未写入 `process.env` 的键补上。
 * Next.js 运行时会自行加载；drizzle-kit 等 Node CLI 不会，须在入口显式调用。
 */
export function loadEnvLocal(): void {
  const envPath = join(process.cwd(), '.env.local');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}

/**
 * 读取必需环境变量；`.env.local` 中应已配置，缺失或空字符串直接抛错。
 * 不加 `server-only`：drizzle-kit 等 Node CLI 走 package default 条件，导入会抛错。
 * 密钥只应被服务端与 CLI 读取，勿从 Client Component import。
 */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${name}`);
  }
  return value;
}
