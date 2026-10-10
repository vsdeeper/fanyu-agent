import { describe, expect, it } from 'vitest';
import type { ProductDocUploadItem } from '../types';
import { getDocPreviewKind, unwrapPreviewFontTags } from './utils';

function doc(name: string, type: string, file?: File): ProductDocUploadItem {
  return { uid: name, name, mimeType: type, size: 0, previewUrl: `blob:${name}`, file };
}

describe('getDocPreviewKind', () => {
  it('markdown / txt', () => {
    expect(getDocPreviewKind(doc('说明书.md', 'text/markdown'))).toBe('markdown');
    expect(getDocPreviewKind(doc('说明.md', ''))).toBe('markdown');
    expect(getDocPreviewKind(doc('卖点.txt', 'text/plain'))).toBe('text');
  });

  it('剥掉语雀 font 标签，保留 Markdown', () => {
    const raw =
      '## <font style="color:rgb(15, 17, 21);">核心设计原则</font>\n**<font style="color:rgb(15, 17, 21);">血统即通行证</font>**';
    expect(unwrapPreviewFontTags(raw)).toBe('## 核心设计原则\n**血统即通行证**');
  });

  it('未知类型走 unsupported', () => {
    expect(getDocPreviewKind(doc('数据.csv', 'text/csv'))).toBe('unsupported');
    expect(getDocPreviewKind(doc('目录.pdf', 'application/pdf'))).toBe('unsupported');
  });
});
