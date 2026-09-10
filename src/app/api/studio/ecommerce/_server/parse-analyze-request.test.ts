import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseEcommerceAnalyzeBody } from './parse-analyze-request';

const DOC = {
  filename: '商业分析.md',
  mediaType: 'text/markdown',
  dataUrl: 'data:text/markdown;base64,5YWl5Y+y',
};

const PRODUCT_DOC = {
  filename: '产品资料.txt',
  mediaType: 'text/plain',
  dataUrl: 'data:text/plain;base64,6L2g5aW9',
};

describe('parseEcommerceAnalyzeBody', () => {
  it('最小合法体通过，kind 默认 mainImage', () => {
    expect(parseEcommerceAnalyzeBody({ documents: [DOC] })).toEqual({
      kind: 'mainImage',
      documents: [DOC],
    });
  });

  it('带 productDocuments 通过并保留', () => {
    expect(
      parseEcommerceAnalyzeBody({
        kind: 'mainImage',
        documents: [DOC],
        productDocuments: [PRODUCT_DOC],
      }),
    ).toEqual({
      kind: 'mainImage',
      documents: [DOC],
      productDocuments: [PRODUCT_DOC],
    });
  });

  it('详情图 kind 也接受 productDocuments 字段', () => {
    const parsed = parseEcommerceAnalyzeBody({
      kind: 'detailImage',
      documents: [DOC],
      productDocuments: [PRODUCT_DOC],
    });
    expect(parsed?.kind).toBe('detailImage');
    expect(parsed?.productDocuments).toEqual([PRODUCT_DOC]);
  });

  it('productDocuments 超 6 份拒绝', () => {
    expect(
      parseEcommerceAnalyzeBody({
        kind: 'mainImage',
        documents: [DOC],
        productDocuments: Array.from({ length: 7 }, (_, i) => ({
          ...PRODUCT_DOC,
          filename: `资料${i}.txt`,
        })),
      }),
    ).toBeNull();
  });

  it('productDocuments 含不允许的类型拒绝', () => {
    expect(
      parseEcommerceAnalyzeBody({
        kind: 'mainImage',
        documents: [DOC],
        productDocuments: [
          {
            filename: '资料.pdf',
            mediaType: 'application/pdf',
            dataUrl: 'data:application/pdf;base64,xx',
          },
        ],
      }),
    ).toBeNull();
  });

  it('缺 documents 拒绝（产品资料不能替代商业分析）', () => {
    expect(parseEcommerceAnalyzeBody({ productDocuments: [PRODUCT_DOC] })).toBeNull();
  });
});
