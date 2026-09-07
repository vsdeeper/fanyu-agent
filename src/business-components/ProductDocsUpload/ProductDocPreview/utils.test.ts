import { describe, expect, it } from 'vitest';
import type { ProductDocUploadItem } from '../types';
import { getDocPreviewKind } from './utils';

function doc(name: string, type: string, file?: File): ProductDocUploadItem {
  return { uid: name, name, mimeType: type, size: 0, previewUrl: `blob:${name}`, file };
}

describe('getDocPreviewKind', () => {
  it('markdown / txt', () => {
    expect(getDocPreviewKind(doc('说明书.md', 'text/markdown'))).toBe('markdown');
    expect(getDocPreviewKind(doc('说明.md', ''))).toBe('markdown');
    expect(getDocPreviewKind(doc('卖点.txt', 'text/plain'))).toBe('text');
  });

  it('未知类型走 unsupported', () => {
    expect(getDocPreviewKind(doc('数据.csv', 'text/csv'))).toBe('unsupported');
    expect(getDocPreviewKind(doc('目录.pdf', 'application/pdf'))).toBe('unsupported');
  });
});
