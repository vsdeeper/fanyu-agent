import {
  CHARACTER_DESIRE_LABEL,
  CHARACTER_FLAW_LABEL,
  CHARACTER_IDENTITY_LABEL,
  CHARACTER_ROLE_OPTIONS,
} from '../../../constants';
import type { NovelCharacter, NovelCharacterRole, NovelRelation } from '../../../types';
import { EMPTY_CHARACTER_FIELD } from '../constants';
import { RELATION_CURVE_STEP, RELATION_LABEL_NEAR_LEAF } from './constants';

export type RelationGraphPalette = {
  protagonist: string;
  antagonist: string;
  supporting: string;
  label: string;
  edge: string;
  surface: string;
};

export type RelationNodePayload = {
  name: string;
  role: NovelCharacterRole;
  identity: string;
  desire: string;
  flaw: string;
};

export type RelationGraphNode = {
  id: string;
  data: RelationNodePayload;
};

export type RelationGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: 'line' | 'quadratic';
  data: { label: string; labelAt: number; bidirectional?: boolean };
  style?: { curveOffset: number };
};

export type RelationGraphData = {
  nodes: RelationGraphNode[];
  edges: RelationGraphEdge[];
};

/** 是否至少有一名写了姓名的人物，供预览按钮判断。 */
export function hasNamedCharacter(characters: readonly NovelCharacter[]): boolean {
  return characters.some((character) => character.name.trim().length > 0);
}

/** 悬停提示是否能用这份节点数据。 */
export function isRelationNodePayload(value: unknown): value is RelationNodePayload {
  if (!value || typeof value !== 'object') return false;
  const data = value as RelationNodePayload;
  return (
    typeof data.name === 'string' &&
    (data.role === 'protagonist' || data.role === 'antagonist' || data.role === 'supporting')
  );
}

/**
 * 收成 G6 数据：丢掉未命名人物，以及两端不在这批人物里或自环的关系。
 * 同一对人物的多条边错开弯曲。方向相反且关系名相同的两条合成一条双箭头，避免两道线穿过同一个字。
 * 关系名靠近度数更低的一端，星形关系不会把文字堆在中心人物上。
 */
export function buildRelationGraphData(
  characters: readonly NovelCharacter[],
  relations: readonly NovelRelation[],
): RelationGraphData {
  const nodes: RelationGraphNode[] = characters
    .filter((character) => character.name.trim())
    .map((character) => ({
      id: character.id,
      data: {
        name: character.name.trim(),
        role: character.role,
        identity: character.identity.trim(),
        desire: character.desire.trim(),
        flaw: character.flaw.trim(),
      },
    }));
  const ids = new Set(nodes.map((node) => node.id));
  const degree = new Map<string, number>();
  for (const relation of relations) {
    if (!ids.has(relation.fromId) || !ids.has(relation.toId)) continue;
    if (relation.fromId === relation.toId) continue;
    degree.set(relation.fromId, (degree.get(relation.fromId) ?? 0) + 1);
    degree.set(relation.toId, (degree.get(relation.toId) ?? 0) + 1);
  }
  const drafts = relations.flatMap((relation, index) => {
    if (!ids.has(relation.fromId) || !ids.has(relation.toId)) return [];
    if (relation.fromId === relation.toId) return [];
    return [
      {
        id: `relation-${index}`,
        source: relation.fromId,
        target: relation.toId,
        label: relation.label.trim(),
        labelAt: labelNearQuieterEnd(
          degree.get(relation.fromId) ?? 0,
          degree.get(relation.toId) ?? 0,
        ),
      },
    ];
  });
  const visible = collapseSameLabelOpposites(drafts);
  const groups = new Map<string, number[]>();
  visible.forEach((edge, index) => {
    const key =
      edge.source < edge.target
        ? `${edge.source}\0${edge.target}`
        : `${edge.target}\0${edge.source}`;
    const indexes = groups.get(key);
    if (indexes) indexes.push(index);
    else groups.set(key, [index]);
  });
  const curveOffset = new Array<number>(visible.length).fill(0);
  for (const indexes of groups.values()) {
    const offsets = parallelCurveOffsets(indexes.length, RELATION_CURVE_STEP);
    indexes.forEach((edgeIndex, order) => {
      curveOffset[edgeIndex] = offsets[order] ?? 0;
    });
  }

  return {
    nodes,
    edges: visible.map((edge, index) => {
      const offset = curveOffset[index] ?? 0;
      const shared = {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: {
          label: edge.label,
          labelAt: edge.labelAt,
          ...(edge.bidirectional ? { bidirectional: true } : {}),
        },
      };
      if (offset === 0) return { ...shared, type: 'line' as const };
      return { ...shared, type: 'quadratic' as const, style: { curveOffset: offset } };
    }),
  };
}

/** 人物节点的悬停内容：姓名、定位，以及身份、欲望、缺陷。 */
export function buildRelationNodeTooltip(node: RelationNodePayload): string {
  const role =
    CHARACTER_ROLE_OPTIONS.find((option) => option.value === node.role)?.label ?? node.role;
  const fields = [
    [CHARACTER_IDENTITY_LABEL, node.identity],
    [CHARACTER_DESIRE_LABEL, node.desire],
    [CHARACTER_FLAW_LABEL, node.flaw],
  ];
  const body = fields
    .map(([label, value]) => {
      const text = value?.trim() ? value : EMPTY_CHARACTER_FIELD;
      return `<div>${escapeHtml(label ?? '')}：${escapeHtml(text)}</div>`;
    })
    .join('');
  return `<div style="white-space:normal;line-height:1.7"><div style="font-weight:600;margin-bottom:4px">${escapeHtml(node.name)} · ${escapeHtml(role)}</div>${body}</div>`;
}

/** 方向相反且文案相同的两条并成一条，保留先出现的方向。 */
function collapseSameLabelOpposites<
  T extends {
    source: string;
    target: string;
    label: string;
    labelAt: number;
    bidirectional?: boolean;
  },
>(drafts: T[]): T[] {
  const consumed = new Set<number>();
  const visible: T[] = [];
  drafts.forEach((edge, index) => {
    if (consumed.has(index)) return;
    const reverse = drafts.findIndex(
      (other, otherIndex) =>
        otherIndex > index &&
        !consumed.has(otherIndex) &&
        other.source === edge.target &&
        other.target === edge.source &&
        other.label === edge.label,
    );
    if (reverse === -1) {
      visible.push(edge);
      return;
    }
    consumed.add(reverse);
    visible.push({ ...edge, bidirectional: true, labelAt: 0.5 });
  });
  return visible;
}

/** 度数相同时刻在中点；否则靠向关系更少的人。 */
function labelNearQuieterEnd(sourceDegree: number, targetDegree: number): number {
  if (sourceDegree < targetDegree) return RELATION_LABEL_NEAR_LEAF;
  if (targetDegree < sourceDegree) return 1 - RELATION_LABEL_NEAR_LEAF;
  return 0.5;
}

/** 多条平行边以 0 为中心对称偏移。两条时用完整间距，一半间距在缩放下会叠成一条线。 */
function parallelCurveOffsets(count: number, step: number): number[] {
  if (count <= 1) return [0];
  const gap = count === 2 ? step * 2 : step;
  const start = -((count - 1) / 2) * gap;
  return Array.from({ length: count }, (_, index) => start + index * gap);
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
