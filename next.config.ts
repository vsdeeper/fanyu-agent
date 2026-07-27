import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 修复：better-sqlite3 含原生绑定，勿打进 bundler，否则运行时加载失败
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
