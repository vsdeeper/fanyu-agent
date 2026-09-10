import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { StudioTaskAssetRecord } from './create-task-assets';
import { serveTaskAsset } from './serve-task-asset';

const ASSET: StudioTaskAssetRecord = {
  id: 'a1',
  taskId: 't1',
  stepKey: 'design',
  kind: 'previewUrl',
  fileName: 'a1.markdown',
  originalName: '商业分析.md',
  mimeType: 'text/markdown',
  createdAt: '2026-09-07T11:46:53.714Z',
};

/** 用给定依赖调用 serveTaskAsset，未覆盖的依赖按「命中资产」的默认值补齐。 */
function serve(overrides: Partial<Parameters<typeof serveTaskAsset>[0]> = {}): Response {
  return serveTaskAsset({
    taskId: 't1',
    assetId: 'a1',
    getTaskAsset: () => ASSET,
    findAssetTaskId: () => undefined,
    readTaskAsset: () => new Uint8Array([1, 2, 3]),
    logTag: 'test-assets',
    ...overrides,
  });
}

/** 汇总 console.error 的全部参数文本，便于断言 404 的定性日志。 */
function loggedText(): string {
  return vi
    .mocked(console.error)
    .mock.calls.map((args) => args.map(String).join(' '))
    .join('\n');
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('serveTaskAsset', () => {
  it('命中资产时返回字节与响应头，且不打日志', async () => {
    const res = serve();

    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/markdown');
    expect(res.headers.get('Content-Disposition')).toContain('inline');
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(console.error).not.toHaveBeenCalled();
  });

  it('资产记录不存在时返回 404 并注明记录不存在', () => {
    const res = serve({ getTaskAsset: () => undefined });

    expect(res.status).toBe(404);
    expect(loggedText()).toContain('资产记录不存在');
  });

  it('资产归属其它任务时返回 404 并回显归属任务 id', () => {
    const res = serve({
      getTaskAsset: () => undefined,
      findAssetTaskId: () => 't2',
    });

    expect(res.status).toBe(404);
    expect(loggedText()).toContain('ownerTaskId=t2');
  });

  it('读盘失败时返回 404 并记录文件名与缺文件原因', () => {
    const error = Object.assign(new Error('ENOENT'), { code: 'ENOENT' });
    const res = serve({
      readTaskAsset: () => {
        throw error;
      },
    });

    expect(res.status).toBe(404);
    expect(loggedText()).toContain('fileName=a1.markdown');
    expect(loggedText()).toContain('磁盘缺文件');
  });
});
