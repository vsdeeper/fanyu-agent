import { describe, expect, it } from 'vitest';
import { canonicalCharacterId, canonicalCharacterIds, characterNameById } from './character-ids';

const characters = [
  { id: 'jiang_xu', name: '姜墟' },
  { id: 'qing_li', name: '青黎' },
  { id: 'jiu_wei_hu', name: '九尾狐' },
];

describe('canonicalCharacterId', () => {
  it('原样 id 保持不动', () => {
    expect(canonicalCharacterId('jiang_xu', characters)).toBe('jiang_xu');
  });

  it('少了下划线且只对应一个人时收成角色表里的 id', () => {
    expect(canonicalCharacterId('jiangxu', characters)).toBe('jiang_xu');
    expect(canonicalCharacterId('jiuweihu', characters)).toBe('jiu_wei_hu');
  });

  it('去掉下划线会撞上多个人时不改', () => {
    const ambiguous = [
      { id: 'an_na', name: '安娜' },
      { id: 'anna', name: '安那' },
    ];
    expect(canonicalCharacterId('a_nna', ambiguous)).toBe('a_nna');
  });

  it('对不上的 id 原样留下', () => {
    expect(canonicalCharacterId('zhu_rong', characters)).toBe('zhu_rong');
  });
});

describe('canonicalCharacterIds', () => {
  it('收成同一人后去重', () => {
    expect(canonicalCharacterIds(['jiangxu', 'jiang_xu', 'qingli'], characters)).toEqual([
      'jiang_xu',
      'qing_li',
    ]);
  });
});

describe('characterNameById', () => {
  it('少下划线时仍换成姓名', () => {
    expect(characterNameById('jiangxu', characters)).toBe('姜墟');
    expect(characterNameById('nobody', characters)).toBe('nobody');
  });
});
