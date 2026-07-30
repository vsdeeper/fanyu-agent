/** 读取必需环境变量；`.env.local` 中应已配置，缺失或空字符串直接抛错 */
export function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少必需的环境变量: ${name}`);
  }
  return value;
}
