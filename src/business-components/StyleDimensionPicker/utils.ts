import { STYLE_DIMENSIONS } from './style-dimensions';
import type {
  StyleDimension,
  StyleDimensionCard,
  StyleDimensionKey,
  StyleDimensionSelections,
} from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

/** 该维度卡片库里的全部卡片 id。 */
function collectCardIds(dimension: StyleDimension): string[] {
  return dimension.groups.flatMap((group) => group.cards.map((card) => card.id));
}

/** 清洗选中态：只保留卡片库中真实存在的 id，并把键序规范成库顺序。 */
export function parseStyleSelections(value: unknown): StyleDimensionSelections {
  if (!isRecord(value)) return {};
  const parsed: StyleDimensionSelections = {};
  for (const dimension of STYLE_DIMENSIONS) {
    const raw = value[dimension.key];
    if (!Array.isArray(raw)) continue;
    const known = new Set(collectCardIds(dimension));
    const ids = raw.filter((id): id is string => typeof id === 'string' && known.has(id));
    if (ids.length) parsed[dimension.key] = Array.from(new Set(ids));
  }
  return parsed;
}

/** 切换一组 id 中某张卡片的选中态，返回新数组。 */
export function toggleStyleCardId(ids: readonly string[], cardId: string): string[] {
  return ids.includes(cardId) ? ids.filter((id) => id !== cardId) : [...ids, cardId];
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

/** 按维度顺序拼文风文本：每维一行「维度名：标签、标签」，空维度与未知 id 跳过。 */
export function formatStyleSelections(selections: StyleDimensionSelections): string {
  return STYLE_DIMENSIONS.flatMap((dimension) => {
    const tags = selectCardsByIds(dimension, selections[dimension.key] ?? []).map(
      (card) => card.tag,
    );
    return tags.length ? [`${dimension.label}：${tags.join('、')}`] : [];
  }).join('\n');
}
