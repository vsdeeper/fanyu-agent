import type { NovelThread } from '../../../types';

export type ThreadDraft = {
  name: string;
  core: string;
  advances: Record<string, string>;
};

/** 把主线收成编辑草稿，缺的卷推进补成空字符串。 */
export function threadToDraft(thread: NovelThread, volumeIds: readonly string[]): ThreadDraft {
  const advances: Record<string, string> = {};
  for (const volumeId of volumeIds) {
    advances[volumeId] = thread.advances.find((item) => item.volumeId === volumeId)?.text ?? '';
  }
  return { name: thread.name, core: thread.core, advances };
}

/** 主线可保存：名称、核心和每一卷推进都有内容。 */
export function isSavableThread(draft: ThreadDraft, volumeIds: readonly string[]): boolean {
  return Boolean(
    draft.name.trim() &&
    draft.core.trim() &&
    volumeIds.every((volumeId) => draft.advances[volumeId]?.trim()),
  );
}

/** 保存前去掉名称、核心和各卷推进的首尾空白。 */
export function trimThread(
  id: string,
  draft: ThreadDraft,
  volumeIds: readonly string[],
): NovelThread {
  return {
    id,
    name: draft.name.trim(),
    core: draft.core.trim(),
    advances: volumeIds.map((volumeId) => ({
      volumeId,
      text: (draft.advances[volumeId] ?? '').trim(),
    })),
  };
}
