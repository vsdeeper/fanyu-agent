import { describe, expect, it } from 'vitest';
import { isSavableOrder, orderToDraft, trimOrder, type OrderDraft } from './utils';

const draft: OrderDraft = {
  name: ' 城里 ',
  question: ' 谁说了算 ',
  entries: [{ id: 'e1', name: ' 派出所 ', rule: ' 先登记 ' }],
};

describe('isSavableOrder', () => {
  it('名称、问题和至少一条写全的规则才可保存', () => {
    expect(isSavableOrder(draft)).toBe(true);
    expect(isSavableOrder({ ...draft, entries: [{ id: 'e1', name: '派出所', rule: ' ' }] })).toBe(
      false,
    );
    expect(isSavableOrder({ ...draft, question: '' })).toBe(false);
    expect(isSavableOrder({ ...draft, entries: [{ id: 'e1', name: ' ', rule: '' }] })).toBe(false);
  });
});

describe('orderToDraft', () => {
  it('复制规则行', () => {
    expect(
      orderToDraft({
        id: 'o1',
        name: '城里',
        question: '谁说了算',
        entries: [{ id: 'e1', name: '派出所', rule: '先登记' }],
      }).entries,
    ).toEqual([{ id: 'e1', name: '派出所', rule: '先登记' }]);
  });
});

describe('trimOrder', () => {
  it('去掉首尾空白，并丢掉空规则行', () => {
    expect(
      trimOrder('o1', {
        ...draft,
        entries: [...draft.entries, { id: 'e2', name: ' ', rule: '' }],
      }),
    ).toEqual({
      id: 'o1',
      name: '城里',
      question: '谁说了算',
      entries: [{ id: 'e1', name: '派出所', rule: '先登记' }],
    });
  });
});
