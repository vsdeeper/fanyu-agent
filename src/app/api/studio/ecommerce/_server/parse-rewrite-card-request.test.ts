import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parseRewriteCardBody } from './parse-rewrite-card-request';

const VALID = {
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

describe('parseRewriteCardBody', () => {
  it('接受合法请求，草稿可空', () => {
    expect(parseRewriteCardBody(VALID)).toEqual(VALID);
  });

  it('接受带草稿的请求', () => {
    const body = { ...VALID, draft: '强调釉面质感' };
    expect(parseRewriteCardBody(body)).toEqual(body);
  });

  it('拒绝非法 themeId', () => {
    expect(parseRewriteCardBody({ ...VALID, themeId: 'product' })).toBeNull();
  });

  it('analysisText 缺省则失败', () => {
    expect(
      parseRewriteCardBody({
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
