import 'server-only';

import { rmSync } from 'fs';
import path from 'path';
import { getChatDir } from '@/lib/db/client';

/** 与 docs/images 资产 id 规则一致，防止路径穿越 */
const SAFE_CHAT_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * 删除会话落盘资源目录：`images/{chatId}`、`docs/{chatId}`。
 * 目录不存在时静默跳过；非法 id 不操作。
 */
export function removeChatStoreDirectories(chatId: string): void {
  if (!SAFE_CHAT_ID_PATTERN.test(chatId)) return;

  const root = path.resolve(getChatDir());
  for (const kind of ['images', 'docs'] as const) {
    const dir = path.resolve(root, kind, chatId);
    if (dir !== root && !dir.startsWith(root + path.sep)) continue;
    rmSync(dir, { recursive: true, force: true });
  }
}
