import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseAnalyzeBody } from './parse-analyze-request';

const IMAGE = {
  filename: '精修图.png',
  mediaType: 'image/png',
  dataUrl: 'data:image/png;base64,UE5H',
};

const DOC = {
  filename: '产品资料.txt',
  mediaType: 'text/plain',
  dataUrl: 'data:text/plain;base64,6L2g5aW9',
};

const LOGO = 'data:image/png;base64,TE9HTw==';

describe('parseAnalyzeBody', () => {
  it('images 为空数组合法（产品精修图非必填）', () => {
    expect(parseAnalyzeBody({ images: [], documents: [DOC] })).toEqual({
      images: [],
      documents: [DOC],
    });
  });

  it('仅产品精修图通过', () => {
    expect(parseAnalyzeBody({ images: [IMAGE] })).toEqual({ images: [IMAGE] });
  });

  it('仅品牌 Logo 通过', () => {
    expect(parseAnalyzeBody({ images: [], brandLogoDataUrl: LOGO })).toEqual({
      images: [],
      brandLogoDataUrl: LOGO,
    });
  });

  it('仅产品说明通过', () => {
    expect(parseAnalyzeBody({ images: [], productDescription: '主打轻量便携' })).toEqual({
      images: [],
      productDescription: '主打轻量便携',
    });
  });

  it('仅产品资料通过', () => {
    expect(parseAnalyzeBody({ images: [], documents: [DOC] })).toEqual({
      images: [],
      documents: [DOC],
    });
  });

  it('四项全空拒绝', () => {
    expect(parseAnalyzeBody({ images: [] })).toBeNull();
    expect(parseAnalyzeBody({ images: [], documents: [] })).toBeNull();
    expect(parseAnalyzeBody({})).toBeNull();
  });

  it('产品说明先 trim：纯空白等同未填，单独出现时拒绝', () => {
    expect(parseAnalyzeBody({ images: [], productDescription: '   ' })).toBeNull();
    // 有其它素材时通过，且空白被裁掉
    expect(parseAnalyzeBody({ images: [], productDescription: '   ', documents: [DOC] })).toEqual({
      images: [],
      documents: [DOC],
      productDescription: '',
    });
  });

  it('产品说明前后空白被裁掉', () => {
    expect(parseAnalyzeBody({ images: [], productDescription: '  冷白配色  ' })).toEqual({
      images: [],
      productDescription: '冷白配色',
    });
  });

  it('产品精修图超 6 张拒绝', () => {
    expect(
      parseAnalyzeBody({
        images: Array.from({ length: 7 }, (_, i) => ({ ...IMAGE, filename: `图${i}.png` })),
      }),
    ).toBeNull();
  });

  it('品牌 Logo 必须是图片 data URL', () => {
    expect(parseAnalyzeBody({ images: [], brandLogoDataUrl: 'https://x/logo.png' })).toBeNull();
    expect(
      parseAnalyzeBody({ images: [], brandLogoDataUrl: 'data:text/plain;base64,TA==' }),
    ).toBeNull();
  });

  it('产品资料含不允许的类型拒绝', () => {
    expect(
      parseAnalyzeBody({
        images: [],
        documents: [
          {
            filename: '资料.pdf',
            mediaType: 'application/pdf',
            dataUrl: 'data:application/pdf;base64,xx',
          },
        ],
      }),
    ).toBeNull();
  });
});
