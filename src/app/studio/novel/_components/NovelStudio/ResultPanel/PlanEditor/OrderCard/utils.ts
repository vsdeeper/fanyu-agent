import type { NovelWorldEntry, NovelWorldOrder } from '../../../types';

export type OrderEntryDraft = {
  id: string;
  name: string;
  rule: string;
};

export type OrderDraft = {
  name: string;
  question: string;
  entries: OrderEntryDraft[];
};

/** 新增一条空白规则，供编辑时追加。 */
export function blankOrderEntry(): OrderEntryDraft {
  return { id: `entry-${crypto.randomUUID().slice(0, 8)}`, name: '', rule: '' };
}

/** 把一层秩序收成编辑草稿。 */
export function orderToDraft(order: NovelWorldOrder): OrderDraft {
  return {
    name: order.name,
    question: order.question,
    entries: order.entries.map((entry) => ({ id: entry.id, name: entry.name, rule: entry.rule })),
  };
}

/** 去掉空白规则。有只填了一半的规则时返回空。 */
export function cleanOrderEntries(entries: OrderEntryDraft[]): NovelWorldEntry[] | undefined {
  const filled = entries.filter((entry) => entry.name.trim() || entry.rule.trim());
  if (filled.some((entry) => !entry.name.trim() || !entry.rule.trim())) return undefined;
  return filled.map((entry) => ({
    id: entry.id,
    name: entry.name.trim(),
    rule: entry.rule.trim(),
  }));
}

/** 秩序可保存：名称、问题，以及至少一条写全的规则。 */
export function isSavableOrder(draft: OrderDraft): boolean {
  const entries = cleanOrderEntries(draft.entries);
  return Boolean(draft.name.trim() && draft.question.trim() && entries && entries.length > 0);
}

/** 保存前去掉首尾空白。规则没写全时返回空。 */
export function trimOrder(id: string, draft: OrderDraft): NovelWorldOrder | undefined {
  const entries = cleanOrderEntries(draft.entries);
  if (!entries || !isSavableOrder(draft)) return undefined;
  return { id, name: draft.name.trim(), question: draft.question.trim(), entries };
}
