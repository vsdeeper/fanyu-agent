import type {
  StructureBeat,
  StructureChapter,
  StructureSnapshot,
  WritingSnapshot,
  WritingUnit,
} from './types';
import { formatChapterPrefix, stripChapterPrefix } from './ResultPanel/ChapterList/utils';

export { formatChapterPrefix, stripChapterPrefix };

export type WritingUnitKind = 'chapter' | 'beat';

export type ResolvedWritingUnit = {
  unitId: string;
  kind: WritingUnitKind;
  label: string;
  chapterId?: string;
  chapterTitle?: string;
  chapterPurpose?: string;
  beatText?: string;
  beatTexts?: string[];
};

/** 收集结构中全部可写 unitId（短篇仅节拍；中长篇含章 id + 各章节拍 id）。 */
export function listWritableUnitIds(structure: StructureSnapshot): string[] {
  if (structure.kind === 'short') {
    return structure.beats.map((beat) => beat.id);
  }
  return structure.chapters.flatMap((chapter) => [
    chapter.id,
    ...chapter.beats.map((beat) => beat.id),
  ]);
}

/** 按当前结构对齐写作 units：保留仍存在的 body，新 id 补空串。 */
export function syncWritingUnits(
  structure: StructureSnapshot,
  prev?: WritingSnapshot,
): WritingSnapshot {
  const prevMap = new Map((prev?.units ?? []).map((unit) => [unit.unitId, unit.body]));
  const units: WritingUnit[] = listWritableUnitIds(structure).map((unitId) => ({
    unitId,
    body: prevMap.get(unitId) ?? '',
  }));
  return { kind: structure.kind, units };
}

/** 判断写作快照是否已有任一非空正文。 */
export function hasWritingBody(writing?: WritingSnapshot): boolean {
  return Boolean(writing?.units.some((unit) => unit.body.trim()));
}

/** 统计正文「字数」：去掉空白后的字符数。 */
export function countTextChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

function findChapterByBeatId(
  chapters: StructureChapter[],
  beatId: string,
): StructureChapter | undefined {
  return chapters.find((chapter) => chapter.beats.some((beat) => beat.id === beatId));
}

function findBeat(chapters: StructureChapter[], beatId: string): StructureBeat | undefined {
  for (const chapter of chapters) {
    const beat = chapter.beats.find((item) => item.id === beatId);
    if (beat) return beat;
  }
  return undefined;
}

/** 解析 unitId 对应的展示与生成上下文。 */
export function resolveWritingUnit(
  structure: StructureSnapshot,
  unitId: string,
): ResolvedWritingUnit | undefined {
  if (structure.kind === 'short') {
    const index = structure.beats.findIndex((beat) => beat.id === unitId);
    if (index < 0) return undefined;
    const beat = structure.beats[index];
    return {
      unitId,
      kind: 'beat',
      label: `节拍 ${index + 1}`,
      beatText: beat.text,
    };
  }

  const chapterIndex = structure.chapters.findIndex((chapter) => chapter.id === unitId);
  if (chapterIndex >= 0) {
    const chapter = structure.chapters[chapterIndex];
    const titleName = stripChapterPrefix(chapter.title);
    return {
      unitId,
      kind: 'chapter',
      label: `${formatChapterPrefix(chapterIndex + 1)}${titleName ? `　${titleName}` : ''}`,
      chapterId: chapter.id,
      chapterTitle: titleName,
      chapterPurpose: chapter.purpose,
      beatTexts: chapter.beats.map((beat) => beat.text),
    };
  }

  const chapter = findChapterByBeatId(structure.chapters, unitId);
  const beat = findBeat(structure.chapters, unitId);
  if (!chapter || !beat) return undefined;
  const chapterIndex2 = structure.chapters.findIndex((item) => item.id === chapter.id);
  const beatIndex = chapter.beats.findIndex((item) => item.id === beat.id);
  const titleName = stripChapterPrefix(chapter.title);
  return {
    unitId,
    kind: 'beat',
    label: `${formatChapterPrefix(chapterIndex2 + 1)} · 节拍 ${beatIndex + 1}`,
    chapterId: chapter.id,
    chapterTitle: titleName,
    chapterPurpose: chapter.purpose,
    beatText: beat.text,
  };
}

/** 进入写作步时的默认选中：短篇首节拍；中长篇首个有节拍的章（含全部节拍）。 */
export function defaultSelectedUnitIds(structure: StructureSnapshot): string[] {
  if (structure.kind === 'short') {
    const first = structure.beats[0]?.id;
    return first ? [first] : [];
  }
  const chapter = structure.chapters.find((item) => item.beats.length > 0);
  if (!chapter) return [];
  return [chapter.id, ...chapter.beats.map((beat) => beat.id)];
}

/**
 * 切换写作单元选中态。
 * 短篇：节拍多选。
 * 中长篇：无节拍的章不可选；有节拍的章点选即全选该章节拍；同章节拍可多选；不可跨章混选。
 * 同章节拍全部选中时，同步选中章标题。
 */
export function toggleWritingSelection(
  structure: StructureSnapshot,
  prevSelected: string[],
  unitId: string,
): string[] {
  if (structure.kind === 'short') {
    if (prevSelected.includes(unitId)) {
      return prevSelected.filter((id) => id !== unitId);
    }
    return [...prevSelected, unitId];
  }

  const chapterIndex = structure.chapters.findIndex((chapter) => chapter.id === unitId);
  if (chapterIndex >= 0) {
    const chapter = structure.chapters[chapterIndex];
    if (chapter.beats.length === 0) return prevSelected;
    const allIds = [chapter.id, ...chapter.beats.map((beat) => beat.id)];
    const allSelected = allIds.every((id) => prevSelected.includes(id));
    if (allSelected) return [];
    return allIds;
  }

  const owner = findChapterByBeatId(structure.chapters, unitId);
  if (!owner || owner.beats.length === 0) return prevSelected;

  const ownerBeatIds = owner.beats.map((beat) => beat.id);
  const ownerBeatIdSet = new Set(ownerBeatIds);
  const prevBeatOnly = prevSelected.filter((id) => ownerBeatIdSet.has(id));
  const prevIsSameChapterContext =
    prevSelected.length > 0 &&
    prevSelected.every((id) => id === owner.id || ownerBeatIdSet.has(id));

  let nextBeats: string[];
  if (prevIsSameChapterContext) {
    if (prevBeatOnly.includes(unitId)) {
      nextBeats = prevBeatOnly.filter((id) => id !== unitId);
    } else {
      nextBeats = [...prevBeatOnly, unitId];
    }
  } else {
    nextBeats = [unitId];
  }

  if (nextBeats.length === 0) return [];

  if (ownerBeatIds.every((id) => nextBeats.includes(id))) {
    return [owner.id, ...nextBeats];
  }
  return nextBeats;
}

/** 章行是否应显示为选中：显式选中章，或该章全部节拍已选中。 */
export function isChapterRowSelected(
  chapter: StructureChapter,
  selectedUnitIds: string[],
): boolean {
  if (chapter.beats.length === 0) return false;
  if (selectedUnitIds.includes(chapter.id)) return true;
  return chapter.beats.every((beat) => selectedUnitIds.includes(beat.id));
}

/**
 * 生成正文的 unitId：仅节拍。
 * 若选中整章，展开为该章全部节拍；无节拍则得到空数组。
 */
export function resolveGenerateUnitIds(
  structure: StructureSnapshot,
  selectedUnitIds: string[],
): string[] {
  if (structure.kind === 'short') return selectedUnitIds;

  const beatIds: string[] = [];
  for (const id of selectedUnitIds) {
    const chapter = structure.chapters.find((item) => item.id === id);
    if (chapter) {
      for (const beat of chapter.beats) {
        if (!beatIds.includes(beat.id)) beatIds.push(beat.id);
      }
      continue;
    }
    if (!beatIds.includes(id)) beatIds.push(id);
  }
  return beatIds;
}

/** 是否可生成正文：选中集合能解析出至少一个节拍。 */
export function canGenerateWriting(
  structure: StructureSnapshot | undefined,
  selectedUnitIds: string[],
): boolean {
  if (!structure || selectedUnitIds.length === 0) return false;
  return resolveGenerateUnitIds(structure, selectedUnitIds).length > 0;
}

export type WritingEditorBeatItem = {
  unitId: string;
  index: number;
  /** 节拍原文摘要，与正文区分展示。 */
  summary: string;
  body: string;
};

export type WritingEditorBlock =
  | {
      type: 'short';
      beats: WritingEditorBeatItem[];
    }
  | {
      type: 'chapter';
      chapterId: string;
      chapterLabel: string;
      beats: WritingEditorBeatItem[];
    };

/** 按当前选中集合构建正文区嵌套展示块。 */
export function buildWritingEditorBlocks(
  structure: StructureSnapshot,
  writing: WritingSnapshot,
  selectedUnitIds: string[],
): WritingEditorBlock[] {
  const bodyOf = (unitId: string) =>
    writing.units.find((unit) => unit.unitId === unitId)?.body ?? '';

  if (selectedUnitIds.length === 0) return [];

  if (structure.kind === 'short') {
    const beats = structure.beats
      .filter((beat) => selectedUnitIds.includes(beat.id))
      .map((beat, index) => {
        const order = structure.beats.findIndex((item) => item.id === beat.id) + 1;
        return {
          unitId: beat.id,
          index: order || index + 1,
          summary: beat.text,
          body: bodyOf(beat.id),
        };
      });
    return beats.length > 0 ? [{ type: 'short', beats }] : [];
  }

  const selected = new Set(selectedUnitIds);
  const blocks: WritingEditorBlock[] = [];

  structure.chapters.forEach((chapter, chapterIndex) => {
    const titleName = stripChapterPrefix(chapter.title);
    const chapterLabel = `${formatChapterPrefix(chapterIndex + 1)}${titleName ? `　${titleName}` : ''}`;
    let selectedBeats = chapter.beats
      .map((beat, beatIndex) => ({ beat, beatIndex }))
      .filter(({ beat }) => selected.has(beat.id))
      .map(({ beat, beatIndex }) => ({
        unitId: beat.id,
        index: beatIndex + 1,
        summary: beat.text,
        body: bodyOf(beat.id),
      }));

    // 仅选中章标题时，展开为该章全部节拍展示（无节拍则跳过）
    if (selected.has(chapter.id) && selectedBeats.length === 0) {
      if (chapter.beats.length === 0) return;
      selectedBeats = chapter.beats.map((beat, beatIndex) => ({
        unitId: beat.id,
        index: beatIndex + 1,
        summary: beat.text,
        body: bodyOf(beat.id),
      }));
    }

    if (selectedBeats.length === 0) return;

    blocks.push({
      type: 'chapter',
      chapterId: chapter.id,
      chapterLabel,
      beats: selectedBeats,
    });
  });

  return blocks;
}
