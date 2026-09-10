import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseRewriteCardBody } from './parse-rewrite-card-request';

const VALID = {
  kind: 'detailImage',
  themeId: 'brand',
  draft: '',
  otherCards: [
    {
      themeId: 'sellingPoint',
      title: '核心卖点',
      requirement: '设计目标：主主张\n展示重点：斜侧看清卖点',
    },
  ],
  analysisText: '这是一份商业分析。',
};

const MAIN_VALID = {
  kind: 'mainImage',
  themeId: 'product',
  draft: '',
  otherCards: [],
  analysisText: '这是一份商业分析。',
};

describe('parseRewriteCardBody', () => {
  it('接受合法请求，草稿可空', () => {
    expect(parseRewriteCardBody(VALID)).toEqual(VALID);
  });

  it('接受带草稿的请求', () => {
    const body = { ...VALID, draft: '强调釉面质感' };
    expect(parseRewriteCardBody(body)).toEqual(body);
  });

  it('接受主图请求', () => {
    expect(parseRewriteCardBody(MAIN_VALID)).toEqual(MAIN_VALID);
  });

  it('主图接受 productDocumentsText，缺省为 undefined', () => {
    const withDocs = { ...MAIN_VALID, productDocumentsText: '容量 500ml，品牌 凡域。' };
    expect(parseRewriteCardBody(withDocs)).toEqual(withDocs);
    const parsed = parseRewriteCardBody(MAIN_VALID);
    expect(
      parsed && parsed.kind === 'mainImage' ? parsed.productDocumentsText : 'x',
    ).toBeUndefined();
  });

  it('缺 kind 被拒', () => {
    expect(
      parseRewriteCardBody({
        themeId: VALID.themeId,
        draft: VALID.draft,
        otherCards: VALID.otherCards,
        analysisText: VALID.analysisText,
      }),
    ).toBeNull();
  });

  it('详情图拒绝主图主题', () => {
    expect(parseRewriteCardBody({ ...VALID, themeId: 'product' })).toBeNull();
  });

  it('主图拒绝详情图主题', () => {
    expect(parseRewriteCardBody({ ...MAIN_VALID, themeId: 'brand' })).toBeNull();
  });

  it('同名 sellingPoint 在两域各自合法', () => {
    expect(parseRewriteCardBody({ ...VALID, themeId: 'sellingPoint' })).toEqual({
      ...VALID,
      themeId: 'sellingPoint',
    });
    expect(parseRewriteCardBody({ ...MAIN_VALID, themeId: 'sellingPoint' })).toEqual({
      ...MAIN_VALID,
      themeId: 'sellingPoint',
    });
  });

  it('analysisText 缺省则失败', () => {
    expect(
      parseRewriteCardBody({
        kind: VALID.kind,
        themeId: VALID.themeId,
        draft: VALID.draft,
        otherCards: VALID.otherCards,
      }),
    ).toBeNull();
  });

  it('analysisText 空字符串可通过校验', () => {
    expect(parseRewriteCardBody({ ...VALID, analysisText: '' })).toEqual({
      ...VALID,
      analysisText: '',
    });
  });

  it('拒绝超过 5 张其它卡', () => {
    const extra = {
      themeId: 'extra',
      title: '其它',
      requirement: 'x',
    };
    expect(
      parseRewriteCardBody({
        ...VALID,
        otherCards: [extra, extra, extra, extra, extra, extra],
      }),
    ).toBeNull();
  });
});
