import type { NovelVolumeOutline } from '../../../types';

/** 分卷目标字数下限。低于此值铺不满一章。 */
export const VOLUME_TARGET_CHARS_MIN = 2000;

/** 手动新增分卷时的默认目标字数。 */
export const DEFAULT_VOLUME_TARGET_CHARS = 200000;

export type VolumeDraft = {
  title: string;
  geography: string;
  conflict: string;
  outcome: string;
  targetChars: number | null;
};

/** 把分卷收成编辑草稿。 */
export function volumeToDraft(volume: NovelVolumeOutline): VolumeDraft {
  return {
    title: volume.title,
    geography: volume.geography,
    conflict: volume.conflict,
    outcome: volume.outcome ?? '',
    targetChars: volume.targetChars,
  };
}

/** 分卷可保存：标题、范围、冲突、结果和目标字数都有内容。 */
export function isSavableVolume(draft: VolumeDraft): boolean {
  return Boolean(
    draft.title.trim() &&
    draft.geography.trim() &&
    draft.conflict.trim() &&
    draft.outcome.trim() &&
    typeof draft.targetChars === 'number' &&
    draft.targetChars >= VOLUME_TARGET_CHARS_MIN,
  );
}

/** 保存前去掉文本首尾空白。字数不合法时返回空。 */
export function trimVolume(id: string, draft: VolumeDraft): NovelVolumeOutline | undefined {
  if (!isSavableVolume(draft) || typeof draft.targetChars !== 'number') return undefined;
  return {
    id,
    title: draft.title.trim(),
    geography: draft.geography.trim(),
    conflict: draft.conflict.trim(),
    outcome: draft.outcome.trim(),
    targetChars: draft.targetChars,
  };
}
