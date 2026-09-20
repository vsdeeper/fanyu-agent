import { STYLE_DIMENSIONS } from './style-dimensions';
import type {
  StyleDimension,
  StyleDimensionCard,
  StyleDimensionGroup,
  StyleDimensionKey,
  StyleDimensionSelections,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/** 卡片 id → 所属分组（即所属的轴）。 */
function indexCardsByGroup(dimension: StyleDimension): Map<string, StyleDimensionGroup> {
  const index = new Map<string, StyleDimensionGroup>();
  for (const group of dimension.groups) {
    for (const card of group.cards) index.set(card.id, group);
  }
  return index;
}

/**
 * 清洗一个维度下的选中 id：丢弃未知 id 与重复项，互斥轴只保留首次出现的一张。
 * 互斥裁剪是为了兼容改造前的快照（同轴可能存了多张，直接拼会互相抵消）。
 */
function sanitizeDimensionIds(dimension: StyleDimension, raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const groups = indexCardsByGroup(dimension);
  const takenExclusive = new Set<StyleDimensionGroup>();
  const seen = new Set<string>();
  const kept: string[] = [];
  for (const value of raw) {
    if (typeof value !== 'string' || seen.has(value)) continue;
    const group = groups.get(value);
    if (!group) continue;
    if (group.exclusive && takenExclusive.has(group)) continue;
    seen.add(value);
    if (group.exclusive) takenExclusive.add(group);
    kept.push(value);
  }
  return kept;
}

/** 清洗选中态：只保留卡片库中真实存在的 id，并把键序规范成库顺序。 */
export function parseStyleSelections(value: unknown): StyleDimensionSelections {
  if (!isRecord(value)) return {};
  const parsed: StyleDimensionSelections = {};
  for (const dimension of STYLE_DIMENSIONS) {
    const ids = sanitizeDimensionIds(dimension, value[dimension.key]);
    if (ids.length) parsed[dimension.key] = ids;
  }
  return parsed;
}

/**
 * 切换一组 id 中某张卡片的选中态，返回新数组。
 * 互斥轴上选中新卡会顶掉同轴原有的一张，避免拼出自相矛盾的提示词；
 * 非互斥轴照常多选。
 */
export function toggleStyleCardId(
  dimension: StyleDimension,
  ids: readonly string[],
  cardId: string,
): string[] {
  if (ids.includes(cardId)) return ids.filter((id) => id !== cardId);
  const group = indexCardsByGroup(dimension).get(cardId);
  if (!group?.exclusive) return [...ids, cardId];
  const siblings = new Set(group.cards.map((card) => card.id));
  return [...ids.filter((id) => !siblings.has(id)), cardId];
}

/**
 * 写入某维度的选中结果：空数组则删键，并按键序重建对象。
 * 键序固定是为了快照 JSON 全等比较不产生假不等。
 */
export function applyDimensionSelection(
  selections: StyleDimensionSelections,
  dimension: StyleDimensionKey,
  cardIds: readonly string[],
): StyleDimensionSelections {
  const merged: StyleDimensionSelections = { ...selections, [dimension]: [...cardIds] };
  const next: StyleDimensionSelections = {};
  for (const item of STYLE_DIMENSIONS) {
    const ids = merged[item.key];
    if (ids?.length) next[item.key] = ids;
  }
  return next;
}

/** 按库顺序取出已选卡片对象，供 Tag 回显；未知 id 跳过。 */
export function selectCardsByIds(
  dimension: StyleDimension,
  ids: readonly string[],
): StyleDimensionCard[] {
  return dimension.groups.flatMap((group) => group.cards).filter((card) => ids.includes(card.id));
}

/**
 * 是否至少选中一张有效卡片：按钮可用性与提交校验的唯一判据。
 * 与 formatStyleSelections 走同一个 selectCardsByIds 过滤，
 * 否则数据文件里删掉某张卡后会出现「按钮可点但派生文本为空」的矛盾态。
 */
export function hasStyleSelection(selections: StyleDimensionSelections): boolean {
  return STYLE_DIMENSIONS.some(
    (dimension) => selectCardsByIds(dimension, selections[dimension.key] ?? []).length > 0,
  );
}

/**
 * 按维度顺序拼文风文本：每维一行「维度名：轴=标签；轴=标签」，空维度与未知 id 跳过。
 * 「轴=」前缀不可省：同一维度的各轴是并列约束（须同时满足），
 * 而一个轴内用「、」连接的多张才是可叠加的一类要求，没有轴名模型分不出这两者。
 */
export function formatStyleSelections(selections: StyleDimensionSelections): string {
  return STYLE_DIMENSIONS.flatMap((dimension) => {
    const selected = new Set(selections[dimension.key] ?? []);
    const axes = dimension.groups.flatMap((group) => {
      const tags = group.cards.filter((card) => selected.has(card.id)).map((card) => card.tag);
      return tags.length ? [`${group.label}=${tags.join('、')}`] : [];
    });
    return axes.length ? [`${dimension.label}：${axes.join('；')}`] : [];
  }).join('\n');
}
