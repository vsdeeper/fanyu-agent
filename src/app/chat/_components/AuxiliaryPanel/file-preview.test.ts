import { describe, expect, it } from 'vitest';
import {
  estimateDataUrlBytes,
  FILE_PREVIEW_MAX_BYTES,
  isAllowedPreviewImageSrc,
  isFileOverPreviewLimit,
  isPreviewableFile,
} from './file-preview';

const ORIGIN = 'http://localhost:3000';

describe('isPreviewableFile', () => {
  it('image/* 即使文件名是 .md 也拒绝', () => {
    expect(isPreviewableFile('notes.md', 'image/png')).toBe(false);
  });

  it('text/html 因 text/* 可预览', () => {
    expect(isPreviewableFile('page.html', 'text/html')).toBe(true);
  });

  it('缺 MIME 时按扩展名放行', () => {
    expect(isPreviewableFile('notes.md')).toBe(true);
    expect(isPreviewableFile('app.ts')).toBe(true);
    expect(isPreviewableFile('virus.exe')).toBe(false);
  });

  it('PDF / Office MIME 拒绝，不被 .md 扩展名盖过', () => {
    expect(isPreviewableFile('doc.md', 'application/pdf')).toBe(false);
    expect(
      isPreviewableFile(
        'doc.md',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ),
    ).toBe(false);
  });

  it('application/json 可预览', () => {
    expect(isPreviewableFile('data.bin', 'application/json')).toBe(true);
  });
});

describe('estimateDataUrlBytes / isFileOverPreviewLimit', () => {
  it('base64 data URL 按 4→3 估算', () => {
    expect(estimateDataUrlBytes('data:text/plain;base64,YWJj')).toBe(3);
  });

  it('非 base64 用 payload 长度作上限且不解码整段', () => {
    expect(estimateDataUrlBytes('data:text/plain,hello')).toBe(5);
  });

  it('非 data URL 不估算', () => {
    expect(estimateDataUrlBytes('/api/docs/a/b')).toBeUndefined();
  });

  it('超过上限返回 true，未知体积视为未超限', () => {
    expect(isFileOverPreviewLimit(FILE_PREVIEW_MAX_BYTES + 1)).toBe(true);
    expect(isFileOverPreviewLimit(FILE_PREVIEW_MAX_BYTES)).toBe(false);
    expect(isFileOverPreviewLimit(undefined)).toBe(false);
  });
});

describe('isAllowedPreviewImageSrc', () => {
  it('接受同源 /api/images/:id', () => {
    expect(isAllowedPreviewImageSrc('/api/images/asset1', ORIGIN)).toBe(true);
    expect(isAllowedPreviewImageSrc('http://localhost:3000/api/images/asset1', ORIGIN)).toBe(true);
  });

  it('拒绝外链与非图片资产路径', () => {
    expect(isAllowedPreviewImageSrc('https://evil.example/x.png', ORIGIN)).toBe(false);
    expect(isAllowedPreviewImageSrc('/api/docs/chat1/asset1', ORIGIN)).toBe(false);
    expect(isAllowedPreviewImageSrc('javascript:alert(1)', ORIGIN)).toBe(false);
  });
});
