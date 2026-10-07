import { describe, expect, it } from 'vitest';
import type { NovelCharacter, NovelRelation } from '../../types';
import { cleanTextList, isSavableCharacter, isSavableRelation, trimCharacter } from './utils';

const character: NovelCharacter = {
  id: 'c1',
  name: ' 李夏 ',
  role: 'protagonist',
  gender: 'female',
  identity: ' 临时工 ',
  desire: '留下',
  flaw: '嘴硬',
};

describe('isSavableCharacter', () => {
  it('姓名、性别、身份、欲望、缺陷都有才可保存', () => {
    expect(isSavableCharacter(character)).toBe(true);
    expect(isSavableCharacter({ ...character, desire: '  ' })).toBe(false);
    expect(isSavableCharacter({ ...character, gender: undefined })).toBe(false);
  });
});

describe('trimCharacter', () => {
  it('去掉姓名和身份首尾空白', () => {
    expect(trimCharacter(character)).toMatchObject({ name: '李夏', identity: '临时工' });
  });
});

describe('isSavableRelation', () => {
  const ids = new Set(['c1', 'c2']);
  const relation: NovelRelation = { fromId: 'c1', toId: 'c2', label: '瞒着' };

  it('两端必须是不同的已有人物', () => {
    expect(isSavableRelation(relation, ids)).toBe(true);
    expect(isSavableRelation({ ...relation, toId: 'c1' }, ids)).toBe(false);
    expect(isSavableRelation({ ...relation, label: ' ' }, ids)).toBe(false);
    expect(isSavableRelation({ ...relation, toId: 'missing' }, ids)).toBe(false);
  });
});

describe('cleanTextList', () => {
  it('丢掉空白条目', () => {
    expect(cleanTextList([' 停电 ', '', '  '])).toEqual(['停电']);
  });
});
