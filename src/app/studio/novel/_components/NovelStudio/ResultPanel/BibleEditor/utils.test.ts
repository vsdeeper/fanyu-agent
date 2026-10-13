import { describe, expect, it } from 'vitest';
import type { NovelCharacter, NovelRelation } from '../../types';
import { isSavableCharacter, isSavableRelation, trimCharacter } from './utils';

const character: NovelCharacter = {
  id: 'c1',
  name: ' 李夏 ',
  role: 'protagonist',
  gender: 'female',
  origin: ' 临时工 ',
  trait: '嘴硬',
  arc: { early: ' 不肯说 ', mid: '  ' },
};

describe('isSavableCharacter', () => {
  it('姓名、性别、出身、特质有内容即可保存；变化可空', () => {
    expect(isSavableCharacter(character)).toBe(true);
    expect(isSavableCharacter({ ...character, arc: undefined })).toBe(true);
    expect(isSavableCharacter({ ...character, trait: '  ' })).toBe(false);
    expect(isSavableCharacter({ ...character, gender: undefined })).toBe(false);
  });
});

describe('trimCharacter', () => {
  it('去掉姓名和出身首尾空白，并丢掉空的变化阶段', () => {
    expect(trimCharacter(character)).toMatchObject({
      name: '李夏',
      origin: '临时工',
      arc: { early: '不肯说' },
    });
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
