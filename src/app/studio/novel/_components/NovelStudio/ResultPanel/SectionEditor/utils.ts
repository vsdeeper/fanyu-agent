import type { NovelSection, NovelSectionBlock } from '../../types';

export type SectionBlockDraft = {
  title: string;
  body: string;
};

export type SectionDraft = {
  title: string;
  blocks: SectionBlockDraft[];
};

/** 编辑器里新建条目用的短 id。 */
export function shortSectionId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** 空的内容块。 */
export function createBlockDraft(): SectionBlockDraft {
  return { title: '', body: '' };
}

/** 新一节：留一个空的内容块，免得打开就是无处可写。 */
export function createSectionDraft(): SectionDraft {
  return { title: '', blocks: [createBlockDraft()] };
}

/** 把一节收成编辑草稿。 */
export function sectionToDraft(section: NovelSection): SectionDraft {
  return {
    title: section.title,
    blocks: section.blocks.map((block) => ({ title: block.title, body: block.body })),
  };
}

/** 一节可保存：写了标题，或有任意一个内容块写了正文。 */
export function isSavableSection(draft: SectionDraft): boolean {
  if (draft.title.trim()) return true;
  return draft.blocks.some((block) => block.body.trim());
}

/** 保存前去掉首尾空白，并丢掉标题与正文都空的内容块。 */
export function trimSection(id: string, draft: SectionDraft): NovelSection | undefined {
  if (!isSavableSection(draft)) return undefined;
  const blocks: NovelSectionBlock[] = draft.blocks
    .map((block) => ({ title: block.title.trim(), body: block.body.trim() }))
    .filter((block) => block.title || block.body);
  return { id, title: draft.title.trim(), blocks };
}
