import type { NovelVolumeBeat, NovelVolumeDesign } from '../../types';

export type BeatDraft = {
  title: string;
  event: string;
  characterIds: string[];
};

export type VolumeDraft = {
  title: string;
  conflict: string;
  hook: string;
  beats: BeatDraft[];
};

/** 编辑器里新建条目用的短 id。 */
export function shortVolumeId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** 空的一拍。 */
export function createBeatDraft(): BeatDraft {
  return { title: '', event: '', characterIds: [] };
}

/** 新一卷：留一拍，免得打开就是无处可写。 */
export function createPendingVolume(id: string): NovelVolumeDesign {
  return {
    id,
    title: '',
    conflict: '',
    hook: '',
    beats: [{ id: `${id}-beat-1`, ...createBeatDraft() }],
  };
}

/** 把一卷收成编辑草稿。 */
export function volumeToDraft(volume: NovelVolumeDesign): VolumeDraft {
  return {
    title: volume.title,
    conflict: volume.conflict,
    hook: volume.hook,
    beats: volume.beats.map((beat) => ({
      title: beat.title,
      event: beat.event,
      characterIds: [...beat.characterIds],
    })),
  };
}

/** 一卷可保存：写了标题或任意一拍写了事。 */
export function isSavableVolume(draft: VolumeDraft): boolean {
  if (draft.title.trim()) return true;
  return draft.beats.some((beat) => beat.event.trim());
}

/**
 * 保存前去掉首尾空白，并丢掉空节拍。
 * 节拍 id 按位置沿用原来的：编辑只改内容，不让章卡的追溯断掉。
 */
export function trimVolume(
  id: string,
  draft: VolumeDraft,
  previous?: NovelVolumeDesign,
): NovelVolumeDesign | undefined {
  if (!isSavableVolume(draft)) return undefined;
  const beats: NovelVolumeBeat[] = draft.beats
    .map((beat, index) => ({
      id: previous?.beats[index]?.id ?? `${id}-beat-${index + 1}`,
      title: beat.title.trim(),
      event: beat.event.trim(),
      characterIds: beat.characterIds,
    }))
    .filter((beat) => beat.title || beat.event);
  return {
    id,
    title: draft.title.trim(),
    conflict: draft.conflict.trim(),
    hook: draft.hook.trim(),
    beats,
    ...(previous?.sourceSectionId ? { sourceSectionId: previous.sourceSectionId } : {}),
  };
}
