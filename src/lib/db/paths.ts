import path from 'path';

/**
 * 会话库路径：落在 CHAT_STORE_DIR 上一级（默认 `data/chats.db`），
 * 与 `chats/`（images/docs）及 `studio/` 平级。
 */
export function resolveChatsDbPath(storeDir: string): string {
  return path.join(path.dirname(path.resolve(storeDir)), 'chats.db');
}

/** 旧路径：库文件曾放在 CHAT_STORE_DIR 内（`data/chats/chats.db`） */
export function resolveLegacyChatsDbPath(storeDir: string): string {
  return path.join(path.resolve(storeDir), 'chats.db');
}
