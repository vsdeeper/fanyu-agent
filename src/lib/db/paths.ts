import path from 'path';

/**
 * 应用库路径：落在 CHAT_STORE_DIR 上一级（默认 `data/app.db`），
 * 与 `chats/`（images/docs）及 `studio/` 平级；存会话与工作室任务元数据。
 */
export function resolveAppDbPath(storeDir: string): string {
  return path.join(path.dirname(path.resolve(storeDir)), 'app.db');
}
