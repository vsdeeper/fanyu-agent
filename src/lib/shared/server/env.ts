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
