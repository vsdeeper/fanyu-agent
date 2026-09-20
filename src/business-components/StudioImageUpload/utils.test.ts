import { describe, expect, it } from 'vitest';
import { createStudioImageUploadItem } from './utils';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe('上传项创建', () => {
  it('新项使用 UUID 且不含文件名', () => {
    const file = new File(['img'], 'multiview-01.png', { type: 'image/png' });
    const item = createStudioImageUploadItem(file, 'blob:test');

    expect(item.uid).toMatch(UUID_RE);
    expect(item.uid).not.toContain(file.name);
    expect(item.name).toBe(file.name);
  });

  it('浏览器未给出 MIME 时回落 image/jpeg', () => {
    const item = createStudioImageUploadItem(new File(['img'], 'a.dat'), 'blob:test');

    expect(item.mimeType).toBe('image/jpeg');
  });
});
