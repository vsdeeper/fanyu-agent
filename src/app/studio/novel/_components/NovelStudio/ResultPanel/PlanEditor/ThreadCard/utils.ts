import type { NovelThread } from '../../../types';

export type ThreadDraft = {
  name: string;
  core: string;
};

/** 把主线收成编辑草稿。 */
export function threadToDraft(thread: NovelThread): ThreadDraft {
  return { name: thread.name, core: thread.core };
}

/** 主线可保存：名称和贯穿全书的文本都有内容。 */
export function isSavableThread(draft: ThreadDraft): boolean {
  return Boolean(draft.name.trim() && draft.core.trim());
}

/** 保存前去掉名称和正文的首尾空白。 */
export function trimThread(id: string, draft: ThreadDraft): NovelThread {
  return { id, name: draft.name.trim(), core: draft.core.trim() };
}
