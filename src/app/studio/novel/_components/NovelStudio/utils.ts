import { NOVEL_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/novel/_shared/task-constants';
import type { NovelStepKey, NovelTaskStepRecord } from '@/app/api/studio/novel/_shared/task-types';
import { parseStyleSelections } from '@/app/studio/_components/StyleDimensionPicker';
import { apiDelete, apiPut } from '@/lib/shared/client/api-client';
import type {
  NovelLongFormat,
  NovelVolume,
  ResearchStepSnapshot,
  StructureBeat,
  StructureChapter,
  StructureSnapshot,
  StructureStepSnapshot,
  StructureVolume,
  StudioPhase,
  TopicCard,
  WritingSnapshot,
  WritingUnit,
  WriteStepSnapshot,
} from './types';
import { formatChapterPrefix, stripChapterPrefix } from './ResultPanel/ChapterList/utils';

export { formatChapterPrefix, stripChapterPrefix };
export { assertOkOrJsonFail, isAbortError } from '@/app/studio/_utils/generate-stream';
export { createRafTextBuffer, consumeAnalyzeSse } from '@/app/studio/_utils/analyze-stream';

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

/** 中篇 chapters 或长篇 volumes 扁平为章列表（全书顺序）。 */
export function listStructureChapters(structure: StructureSnapshot): StructureChapter[] {
  if (structure.kind === 'short') return [];
  if (structure.kind === 'chapters') return structure.chapters;
  return structure.volumes.flatMap((volume) => volume.chapters);
}

/** 写作快照 kind：volumes 扁平后与 chapters 相同。 */
export function writingKindFromStructure(structure: StructureSnapshot): WritingSnapshot['kind'] {
  return structure.kind === 'short' ? 'short' : 'chapters';
}

/** 长篇是否至少有一卷已生成章纲（进入写作门槛；允许分批补其余卷）。 */
export function areVolumesReadyForWrite(structure: StructureSnapshot): boolean {
  if (structure.kind !== 'volumes') return true;
  if (structure.volumes.length === 0) return false;
  return structure.volumes.some((volume) => volume.chapters.length > 0);
}

/** 收集结构中全部可写 unitId（短篇仅节拍；中长篇含章 id + 各章节拍 id）。 */
export function listWritableUnitIds(structure: StructureSnapshot): string[] {
  if (structure.kind === 'short') {
    return structure.beats.map((beat) => beat.id);
  }
  return listStructureChapters(structure).flatMap((chapter) => [
    chapter.id,
    ...chapter.beats.map((beat) => beat.id),
  ]);
}

/** 按当前结构对齐写作 units：保留仍存在的 body 与文风，新 id 补空串。 */
export function syncWritingUnits(
  structure: StructureSnapshot,
  prev?: WritingSnapshot,
): WritingSnapshot {
  const prevMap = new Map((prev?.units ?? []).map((unit) => [unit.unitId, unit.body]));
  const units: WritingUnit[] = listWritableUnitIds(structure).map((unitId) => ({
    unitId,
    body: prevMap.get(unitId) ?? '',
  }));
  return {
    kind: writingKindFromStructure(structure),
    units,
    ...(prev?.styleSelections && Object.keys(prev.styleSelections).length
      ? { styleSelections: prev.styleSelections }
      : {}),
  };
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

  const chapters = listStructureChapters(structure);
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === unitId);
  if (chapterIndex >= 0) {
    const chapter = chapters[chapterIndex];
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

  const chapter = findChapterByBeatId(chapters, unitId);
  const beat = findBeat(chapters, unitId);
  if (!chapter || !beat) return undefined;
  const chapterIndex2 = chapters.findIndex((item) => item.id === chapter.id);
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

  const chapters = listStructureChapters(structure);
  const chapterIndex = chapters.findIndex((chapter) => chapter.id === unitId);
  if (chapterIndex >= 0) {
    const chapter = chapters[chapterIndex];
    if (chapter.beats.length === 0) return prevSelected;
    const allIds = [chapter.id, ...chapter.beats.map((beat) => beat.id)];
    const allSelected = allIds.every((id) => prevSelected.includes(id));
    if (allSelected) return [];
    return allIds;
  }

  const owner = findChapterByBeatId(chapters, unitId);
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

  const chapters = listStructureChapters(structure);
  const beatIds: string[] = [];
  for (const id of selectedUnitIds) {
    const chapter = chapters.find((item) => item.id === id);
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

/** 预览节：中长篇带章标题；短篇无章标题。 */
export type PreviewSection = {
  chapterLabel?: string;
  paragraphs: string[];
};

/** 预览文稿：结构化节 + 一键复制用纯文本。 */
export type PreviewDocument = {
  sections: PreviewSection[];
  plainText: string;
};

/** 按全结构顺序组装预览文稿：仅非空节拍正文；中长篇保留章标题分隔。 */
export function buildPreviewDocument(
  structure: StructureSnapshot,
  writing: WritingSnapshot,
): PreviewDocument {
  const bodyOf = (unitId: string) =>
    writing.units.find((unit) => unit.unitId === unitId)?.body.trim() ?? '';

  if (structure.kind === 'short') {
    const paragraphs = structure.beats
      .map((beat) => bodyOf(beat.id))
      .filter((body) => body.length > 0);
    return {
      sections: paragraphs.length > 0 ? [{ paragraphs }] : [],
      plainText: paragraphs.join('\n\n'),
    };
  }

  const sections: PreviewSection[] = [];
  const plainParts: string[] = [];

  listStructureChapters(structure).forEach((chapter, chapterIndex) => {
    const paragraphs = chapter.beats
      .map((beat) => bodyOf(beat.id))
      .filter((body) => body.length > 0);
    if (paragraphs.length === 0) return;

    const titleName = stripChapterPrefix(chapter.title);
    const chapterLabel = `${formatChapterPrefix(chapterIndex + 1)}${titleName ? `　${titleName}` : ''}`;
    sections.push({ chapterLabel, paragraphs });
    plainParts.push(`${chapterLabel}\n\n${paragraphs.join('\n\n')}`);
  });

  return {
    sections,
    plainText: plainParts.join('\n\n\n'),
  };
}

/** 复制纯文本到剪贴板。 */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

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

  listStructureChapters(structure).forEach((chapter, chapterIndex) => {
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

/** 流式展示用：去掉末尾 ```json 围栏（含尚未闭合的）。 */
export function stripTrailingJsonFenceForDisplay(text: string): string {
  const complete = text.match(/```json\s*[\s\S]*?```\s*$/i);
  if (complete?.index != null) {
    return text.slice(0, complete.index).trimEnd();
  }
  const open = /```json\b/i.exec(text);
  if (open?.index != null) {
    return text.slice(0, open.index).trimEnd();
  }
  return text;
}

/** 拆分流式全文末尾的 JSON 代码块。 */
export function extractTrailingJsonBlock(text: string): {
  prose: string;
  json: unknown | null;
} {
  const match = text.match(/```json\s*([\s\S]*?)```\s*$/i);
  if (match?.index != null) {
    const prose = text.slice(0, match.index).trim();
    try {
      return { prose, json: JSON.parse(match[1]!) as unknown };
    } catch {
      return { prose, json: null };
    }
  }
  const open = /```json\b/i.exec(text);
  if (open?.index != null) {
    const prose = text.slice(0, open.index).trim();
    const raw = text
      .slice(open.index + open[0].length)
      .replace(/```\s*$/, '')
      .trim();
    try {
      return { prose, json: JSON.parse(raw) as unknown };
    } catch {
      return { prose, json: null };
    }
  }
  const bare = text.match(/```\s*([\s\S]*?)```\s*$/);
  if (bare?.index != null) {
    const inner = bare[1]!.trim();
    if (inner.startsWith('{')) {
      try {
        return { prose: text.slice(0, bare.index).trim(), json: JSON.parse(inner) as unknown };
      } catch {
        /* 继续尝试无围栏 */
      }
    }
  }
  for (const key of ['"topics"', '"beats"', '"kind"', '"chapters"', '"volumes"'] as const) {
    const at = text.lastIndexOf(key);
    if (at < 0) continue;
    const brace = text.lastIndexOf('{', at);
    if (brace < 0) continue;
    try {
      const json = JSON.parse(text.slice(brace).trim()) as unknown;
      if (json && typeof json === 'object') {
        return { prose: text.slice(0, brace).trim(), json };
      }
    } catch {
      /* 尝试下一关键字 */
    }
  }
  return { prose: text.trim(), json: null };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function isNovelVolume(value: unknown): value is NovelVolume {
  return value === 'short' || value === 'medium' || value === 'long';
}

function isNovelLongFormat(value: unknown): value is NovelLongFormat {
  return value === 'publish' || value === 'web';
}

function parseTopicCard(value: unknown): TopicCard | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const title = asString(record.title);
  const genreVolume = asString(record.genreVolume);
  const why = asString(record.why);
  const core = asString(record.core);
  if (!id || !title || !genreVolume || !why || !core) return null;
  const risk = asString(record.risk);
  return { id, title, genreVolume, why, core, ...(risk ? { risk } : {}) };
}

function parseBeat(value: unknown): StructureBeat | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const text = asString(record.text);
  if (!id || !text) return null;
  return { id, text };
}

function parseChapter(value: unknown): StructureChapter | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const title = asString(record.title);
  const purpose = asString(record.purpose);
  if (!id || !title || !purpose) return null;
  const beats: StructureBeat[] = [];
  if (Array.isArray(record.beats)) {
    for (const item of record.beats) {
      const beat = parseBeat(item);
      if (beat) beats.push(beat);
    }
  }
  return { id, title, purpose, beats };
}

function parseVolume(value: unknown): StructureVolume | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const title = asString(record.title);
  const purpose = asString(record.purpose);
  if (!id || !title || !purpose) return null;
  const chapters: StructureChapter[] = [];
  if (Array.isArray(record.chapters)) {
    for (const item of record.chapters) {
      const chapter = parseChapter(item);
      if (chapter) chapters.push(chapter);
    }
  }
  return { id, title, purpose, chapters };
}

/** 解析调研 JSON 为选题卡列表。 */
export function parseResearchTopics(json: unknown): TopicCard[] {
  if (!json || typeof json !== 'object') return [];
  const record = json as Record<string, unknown>;
  const topics: TopicCard[] = [];
  if (!Array.isArray(record.topics)) return topics;
  for (const item of record.topics) {
    const topic = parseTopicCard(item);
    if (topic) topics.push(topic);
  }
  return topics;
}

/** 解析结构 JSON；失败返回 null。 */
export function parseStructurePayload(json: unknown): StructureSnapshot | null {
  if (!json || typeof json !== 'object') return null;
  const record = json as Record<string, unknown>;
  if (record.kind === 'short') {
    const synopsis = asString(record.synopsis) ?? '';
    const beats: StructureBeat[] = [];
    if (Array.isArray(record.beats)) {
      for (const item of record.beats) {
        const beat = parseBeat(item);
        if (beat) beats.push(beat);
      }
    }
    if (beats.length === 0) return null;
    return { kind: 'short', synopsis, beats };
  }
  if (record.kind === 'chapters') {
    const chapters: StructureChapter[] = [];
    if (Array.isArray(record.chapters)) {
      for (const item of record.chapters) {
        const chapter = parseChapter(item);
        if (chapter) chapters.push(chapter);
      }
    }
    if (chapters.length === 0) return null;
    return { kind: 'chapters', chapters };
  }
  if (record.kind === 'volumes') {
    const volumes: StructureVolume[] = [];
    if (Array.isArray(record.volumes)) {
      for (const item of record.volumes) {
        const volume = parseVolume(item);
        if (volume) volumes.push(volume);
      }
    }
    if (volumes.length === 0) return null;
    return { kind: 'volumes', volumes };
  }
  return null;
}

/** 解析按卷章纲 JSON。 */
export function parseVolumeChaptersPayload(json: unknown): StructureChapter[] {
  if (!json || typeof json !== 'object') return [];
  const record = json as Record<string, unknown>;
  const chapters: StructureChapter[] = [];
  if (!Array.isArray(record.chapters)) return chapters;
  for (const item of record.chapters) {
    const chapter = parseChapter(item);
    if (chapter) chapters.push({ ...chapter, beats: [] });
  }
  return chapters;
}

/** 解析章内节拍 JSON。 */
export function parseChapterBeatsPayload(json: unknown): StructureBeat[] {
  if (!json || typeof json !== 'object') return [];
  const record = json as Record<string, unknown>;
  const beats: StructureBeat[] = [];
  if (!Array.isArray(record.beats)) return beats;
  for (const item of record.beats) {
    const beat = parseBeat(item);
    if (beat) beats.push(beat);
  }
  return beats;
}

/** 从落盘 data 读取调研快照。 */
export function readResearchStepSnapshot(data: unknown): ResearchStepSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const idea = asString(record.idea);
  if (!idea) return undefined;
  const volume = isNovelVolume(record.volume) ? record.volume : 'short';
  const longFormat = isNovelLongFormat(record.longFormat) ? record.longFormat : 'publish';
  const genres = Array.isArray(record.genres)
    ? record.genres.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
    : [];
  const topics: TopicCard[] = [];
  if (Array.isArray(record.topics)) {
    for (const item of record.topics) {
      const topic = parseTopicCard(item);
      if (topic) topics.push(topic);
    }
  }
  const selectedTopicId = asString(record.selectedTopicId);
  const streamText = asString(record.streamText);
  return {
    idea,
    genres,
    volume,
    longFormat,
    topics,
    ...(selectedTopicId ? { selectedTopicId } : {}),
    ...(streamText ? { streamText } : {}),
  };
}

/** 从落盘 data 读取结构快照。 */
export function readStructureStepSnapshot(data: unknown): StructureStepSnapshot | undefined {
  const parsed = parseStructurePayload(data);
  if (!parsed) return undefined;
  const streamText =
    data && typeof data === 'object'
      ? asString((data as Record<string, unknown>).streamText)
      : undefined;
  return streamText ? { ...parsed, streamText } : parsed;
}

/** 从落盘 data 读取写作快照。 */
export function readWriteStepSnapshot(data: unknown): WriteStepSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if (record.kind !== 'short' && record.kind !== 'chapters') return undefined;
  const units: WritingUnit[] = [];
  if (Array.isArray(record.units)) {
    for (const item of record.units) {
      if (!item || typeof item !== 'object') continue;
      const unit = item as Record<string, unknown>;
      const unitId = asString(unit.unitId);
      if (!unitId) continue;
      const body = typeof unit.body === 'string' ? unit.body : '';
      units.push({ unitId, body });
    }
  }
  const styleSelections = parseStyleSelections(record.styleSelections);
  return {
    kind: record.kind,
    units,
    ...(Object.keys(styleSelections).length ? { styleSelections } : {}),
  };
}

/** 首次进入/刷新默认停在第一步选题调研；有选题卡则进入 researched 结果态。 */
export function resolveInitialPhase(research: ResearchStepSnapshot | undefined): StudioPhase {
  if (research?.topics.length) return 'researched';
  return 'research';
}

/** 落盘小说步骤快照，返回服务端处理后的 data。 */
export async function saveNovelStep<T>(taskId: string, stepKey: NovelStepKey, data: T): Promise<T> {
  const record = await apiPut<NovelTaskStepRecord>(
    `/api/studio/novel/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: NOVEL_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

/** 删除小说步骤快照；不存在时服务端仍返回成功信封。 */
export async function deleteNovelStep(taskId: string, stepKey: NovelStepKey): Promise<void> {
  await apiDelete(`/api/studio/novel/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`);
}
