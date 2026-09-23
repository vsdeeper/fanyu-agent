import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { rmSync } = vi.hoisted(() => ({
  rmSync: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('fs', () => ({
  rmSync,
}));
vi.mock('@/lib/db/client', () => ({
  getChatDir: () => 'D:/tmp/chats',
}));

import { removeChatStoreDirectories } from './remove-chat-files';

describe('removeChatStoreDirectories', () => {
  beforeEach(() => {
    rmSync.mockClear();
  });

  it('删除 images 与 docs 下的会话目录', () => {
    removeChatStoreDirectories('chat-abc');
    const root = path.resolve('D:/tmp/chats');
    expect(rmSync).toHaveBeenCalledTimes(2);
    expect(rmSync).toHaveBeenCalledWith(path.resolve(root, 'images', 'chat-abc'), {
      recursive: true,
      force: true,
    });
    expect(rmSync).toHaveBeenCalledWith(path.resolve(root, 'docs', 'chat-abc'), {
      recursive: true,
      force: true,
    });
  });

  it('非法 chatId 不删任何目录', () => {
    removeChatStoreDirectories('../evil');
    expect(rmSync).not.toHaveBeenCalled();
  });
});
