import { describe, expect, it } from 'vitest';
import type { NovelCharacter, NovelRelation } from '../../../types';
import { RELATION_CURVE_STEP, RELATION_LABEL_NEAR_LEAF } from './constants';
import { buildRelationGraphData, buildRelationNodeTooltip, hasNamedCharacter } from './utils';

function character(
  patch: Partial<NovelCharacter> & Pick<NovelCharacter, 'id' | 'name'>,
): NovelCharacter {
  return {
    role: 'supporting',
    identity: '',
    desire: '',
    flaw: '',
    ...patch,
  };
}

describe('hasNamedCharacter', () => {
  it('至少一名写了姓名才可预览', () => {
    expect(hasNamedCharacter([character({ id: 'a', name: '  ' })])).toBe(false);
    expect(hasNamedCharacter([character({ id: 'a', name: '甲' })])).toBe(true);
  });
});

describe('buildRelationGraphData', () => {
  const characters = [
    character({
      id: 'a',
      name: ' 甲 ',
      role: 'protagonist',
      identity: '临时工',
      desire: '留下',
      flaw: '嘴硬',
    }),
    character({ id: 'b', name: '乙', role: 'antagonist' }),
    character({ id: 'c', name: '   ' }),
  ];

  it('丢掉未命名人物、指向他们的关系，以及自环', () => {
    const relations: NovelRelation[] = [
      { fromId: 'a', toId: 'b', label: ' 敌对 ' },
      { fromId: 'a', toId: 'c', label: '无效' },
      { fromId: 'a', toId: 'a', label: '自环' },
      { fromId: 'missing', toId: 'a', label: '无' },
    ];
    const data = buildRelationGraphData(characters, relations);
    expect(data.nodes.map((node) => node.data.name)).toEqual(['甲', '乙']);
    expect(data.edges).toEqual([
      {
        id: 'relation-0',
        source: 'a',
        target: 'b',
        type: 'line',
        data: { label: '敌对', labelAt: 0.5 },
      },
    ]);
  });

  it('关系名靠向关系更少的人', () => {
    const cast = [
      character({ id: 'hub', name: '闻烛' }),
      character({ id: 'a', name: '山脊' }),
      character({ id: 'b', name: '卫骥' }),
    ];
    const relations: NovelRelation[] = [
      { fromId: 'hub', toId: 'a', label: '主仆' },
      { fromId: 'b', toId: 'hub', label: '跟随' },
    ];
    const data = buildRelationGraphData(cast, relations);
    expect(data.edges.map((edge) => edge.data.labelAt)).toEqual([
      1 - RELATION_LABEL_NEAR_LEAF,
      RELATION_LABEL_NEAR_LEAF,
    ]);
  });

  it('同名的来回关系合成一条双向边', () => {
    const relations: NovelRelation[] = [
      { fromId: 'a', toId: 'b', label: '护主' },
      { fromId: 'b', toId: 'a', label: '护主' },
    ];
    const data = buildRelationGraphData(characters, relations);
    expect(data.edges).toEqual([
      {
        id: 'relation-0',
        source: 'a',
        target: 'b',
        type: 'line',
        data: { label: '护主', labelAt: 0.5, bidirectional: true },
      },
    ]);
  });

  it('反向但文案不同的两条分开弯曲', () => {
    const relations: NovelRelation[] = [
      { fromId: 'a', toId: 'b', label: '护主' },
      { fromId: 'b', toId: 'a', label: '跟随' },
    ];
    const data = buildRelationGraphData(characters, relations);
    expect(data.edges.map((edge) => edge.data.bidirectional)).toEqual([undefined, undefined]);
    expect(data.edges.map((edge) => edge.style?.curveOffset)).toEqual([
      -RELATION_CURVE_STEP,
      RELATION_CURVE_STEP,
    ]);
  });

  it('同一对人物的多条边对称错开', () => {
    const relations: NovelRelation[] = [
      { fromId: 'a', toId: 'b', label: '敌对' },
      { fromId: 'b', toId: 'a', label: '忌惮' },
      { fromId: 'a', toId: 'b', label: '旧识' },
    ];
    const data = buildRelationGraphData(characters, relations);
    expect(data.edges.map((edge) => edge.type)).toEqual(['quadratic', 'line', 'quadratic']);
    expect(data.edges.map((edge) => edge.style?.curveOffset ?? 0)).toEqual([
      -RELATION_CURVE_STEP,
      0,
      RELATION_CURVE_STEP,
    ]);
  });
});

describe('buildRelationNodeTooltip', () => {
  it('转义姓名和字段，空字段显示未填写', () => {
    const html = buildRelationNodeTooltip({
      name: '<甲>',
      role: 'protagonist',
      identity: '',
      desire: '想&要',
      flaw: '缺"陷',
    });
    expect(html).toContain('&lt;甲&gt;');
    expect(html).toContain('主角');
    expect(html).toContain('身份：未填写');
    expect(html).toContain('欲望：想&amp;要');
    expect(html).toContain('缺陷：缺&quot;陷');
    expect(html).not.toContain('<甲>');
  });
});
