import type { NovelWorldAssetGroup } from '../../../types';

export type AssetGroupDraft = {
  category: string;
  itemsText: string;
};

/** 要素名按行拆开，空行丢掉。 */
export function textToItems(text: string): string[] {
  return text
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

/** 把一组物质基础收成编辑草稿。要素名一行一个。 */
export function assetGroupToDraft(group: NovelWorldAssetGroup): AssetGroupDraft {
  return { category: group.category, itemsText: group.items.join('\n') };
}

/** 物质基础可保存：功能和至少一个要素名。 */
export function isSavableAssetGroup(draft: AssetGroupDraft): boolean {
  return Boolean(draft.category.trim() && textToItems(draft.itemsText).length > 0);
}

/** 保存前去掉首尾空白。没有要素名时返回空。 */
export function trimAssetGroup(
  id: string,
  draft: AssetGroupDraft,
): NovelWorldAssetGroup | undefined {
  if (!isSavableAssetGroup(draft)) return undefined;
  return { id, category: draft.category.trim(), items: textToItems(draft.itemsText) };
}
