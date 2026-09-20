import { describe, expect, it } from 'vitest';
import { createProductDocUploadItem, toDocMediaType } from './utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('资料项创建', () => {
  it('新项使用 UUID、不含文件名，并带上展示用元信息', () => {
    const file = new File(['doc'], '美的台扇FGAU40D说明书.md', { type: 'text/markdown' });
    const item = createProductDocUploadItem(file, 'blob:test');

    expect(item.uid).toMatch(UUID_RE);
    expect(item.uid).not.toContain(file.name);
    expect(item.name).toBe(file.name);
    expect(item.mimeType).toBe('text/markdown');
  });
});

describe('toDocMediaType', () => {
  it('浏览器未给出 MIME 时按扩展名兜底', () => {
    expect(toDocMediaType(new File(['a'], 'a.txt'))).toBe('text/plain');
    expect(toDocMediaType(new File(['a'], 'a.md'))).toBe('text/markdown');
    expect(toDocMediaType(new File(['a'], 'a.bin'))).toBe('application/octet-stream');
  });
});
