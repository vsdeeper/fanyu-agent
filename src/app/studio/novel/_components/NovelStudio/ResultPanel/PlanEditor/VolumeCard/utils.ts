import type { NovelVolumeAsset, NovelVolumeOutline } from '../../../types';

/** 分卷目标字数下限。低于此值铺不满一章。 */
export const VOLUME_TARGET_CHARS_MIN = 2000;

/** 手动新增分卷时的默认目标字数。 */
export const DEFAULT_VOLUME_TARGET_CHARS = 200000;

export type VolumeAssetDraft = {
  name: string;
  use: string;
};

export type VolumeDraft = {
  title: string;
  geography: string;
  conflict: string;
  relations: string;
  assets: VolumeAssetDraft[];
  hook: string;
  targetChars: number | null;
};

/** 把分卷收成编辑草稿。 */
export function volumeToDraft(volume: NovelVolumeOutline): VolumeDraft {
  return {
    title: volume.title,
    geography: volume.geography,
    conflict: volume.conflict,
    relations: volume.relations,
    assets: volume.assets.map((asset) => ({ name: asset.name, use: asset.use })),
    hook: volume.hook,
    targetChars: volume.targetChars,
  };
}

/** 去掉空白行。有只填了一半的要素时返回空，避免半条用法被存下来。 */
export function cleanVolumeAssets(assets: VolumeAssetDraft[]): NovelVolumeAsset[] | undefined {
  const filled = assets.filter((asset) => asset.name.trim() || asset.use.trim());
  if (filled.some((asset) => !asset.name.trim() || !asset.use.trim())) return undefined;
  return filled.map((asset) => ({ name: asset.name.trim(), use: asset.use.trim() }));
}

/** 分卷可保存：标题、地图、冲突、人物推进、钩子和目标字数都有内容。要素可以空。 */
export function isSavableVolume(draft: VolumeDraft): boolean {
  return Boolean(
    draft.title.trim() &&
    draft.geography.trim() &&
    draft.conflict.trim() &&
    draft.relations.trim() &&
    draft.hook.trim() &&
    cleanVolumeAssets(draft.assets) &&
    typeof draft.targetChars === 'number' &&
    draft.targetChars >= VOLUME_TARGET_CHARS_MIN,
  );
}

/** 保存前去掉文本首尾空白。字数不合法或要素只填了一半时返回空。 */
export function trimVolume(id: string, draft: VolumeDraft): NovelVolumeOutline | undefined {
  const assets = cleanVolumeAssets(draft.assets);
  if (!isSavableVolume(draft) || typeof draft.targetChars !== 'number' || !assets) return undefined;
  return {
    id,
    title: draft.title.trim(),
    geography: draft.geography.trim(),
    conflict: draft.conflict.trim(),
    relations: draft.relations.trim(),
    assets,
    hook: draft.hook.trim(),
    targetChars: draft.targetChars,
  };
}
