import { describe, expect, it } from 'vitest';
import type { ProductDocUploadItem } from '../types';
import { getDocPreviewKind } from './utils';

function doc(name: string, type: string, file?: File): ProductDocUploadItem {
  return { uid: name, name, mimeType: type, size: 0, previewUrl: `blob:${name}`, file };
}

describe('getDocPreviewKind', () => {
  it('按 mime 判图片', () => {
    expect(getDocPreviewKind(doc('品牌.png', 'image/png'))).toBe('image');
    expect(getDocPreviewKind(doc('品牌.jpeg', 'image/jpeg'))).toBe('image');
  });

  it('无 mime 时按扩展名判图片', () => {
    expect(getDocPreviewKind(doc('品牌.webp', ''))).toBe('image');
    expect(getDocPreviewKind(doc('品牌.gif', ''))).toBe('image');
  });

  it('markdown / txt / pdf / docx', () => {
    expect(getDocPreviewKind(doc('说明书.md', 'text/markdown'))).toBe('markdown');
    expect(getDocPreviewKind(doc('说明.md', ''))).toBe('markdown');
    expect(getDocPreviewKind(doc('卖点.txt', 'text/plain'))).toBe('text');
    expect(getDocPreviewKind(doc('目录.pdf', 'application/pdf'))).toBe('pdf');
    expect(
      getDocPreviewKind(
        doc('合同.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      ),
    ).toBe('docx');
  });

  it('未知类型走 unsupported', () => {
    expect(getDocPreviewKind(doc('数据.csv', 'text/csv'))).toBe('unsupported');
  });
});
