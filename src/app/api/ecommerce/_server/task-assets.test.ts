import { beforeEach, describe, expect, it, vi } from 'vitest';

const { insertValues, writeFileSync } = vi.hoisted(() => ({
  insertValues: vi.fn(),
  writeFileSync: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('ai', () => ({ generateId: () => 'asset-1' }));
vi.mock('fs', () => ({
  existsSync: () => true,
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  rmSync: vi.fn(),
  writeFileSync,
}));
vi.mock('@/lib/db/client', () => ({
  getChatDir: () => 'D:/tmp/chats',
  getDb: () => ({
    insert: () => ({
      values: (row: unknown) => {
        insertValues(row);
        return { run: () => undefined };
      },
    }),
  }),
}));

import { persistSnapshotAssets } from './task-assets';

describe('persistSnapshotAssets', () => {
  beforeEach(() => {
    insertValues.mockClear();
    writeFileSync.mockClear();
  });

  it('将快照中的 data URL 落盘并替换为任务资产地址', () => {
    const next = persistSnapshotAssets('task-1', 'visual', {
      form: { count: '1' },
      visualImages: [
        {
          index: 0,
          url: 'data:image/png;base64,aGVsbG8=',
          name: 'visual-01.png',
        },
      ],
    });

    expect(writeFileSync).toHaveBeenCalledOnce();
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'asset-1',
        taskId: 'task-1',
        stepKey: 'visual',
        kind: 'url',
        originalName: 'visual-01.png',
        mimeType: 'image/png',
      }),
    );
    expect(next).toEqual({
      form: { count: '1' },
      visualImages: [
        {
          index: 0,
          url: '/api/ecommerce/tasks/task-1/assets/asset-1',
          name: 'visual-01.png',
        },
      ],
    });
  });

  it('已持久化的站内 URL 保持不变', () => {
    const snapshot = {
      images: [{ previewUrl: '/api/ecommerce/tasks/task-1/assets/old' }],
    };
    expect(persistSnapshotAssets('task-1', 'analysis', snapshot)).toEqual(snapshot);
    expect(writeFileSync).not.toHaveBeenCalled();
  });
});
