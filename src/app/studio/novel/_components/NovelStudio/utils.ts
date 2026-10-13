import {
  NOVEL_MAX_IDEA_FILES,
  NOVEL_MAX_PLAN_FILES,
} from '@/app/api/studio/novel/_shared/idea-file';
import {
  NOVEL_THREAD_COUNT_MAX,
  NOVEL_THREAD_COUNT_MIN,
  readNovelReasoningEffort,
} from '@/app/api/studio/novel/_shared/constants';
import { normalizeNovelPlan } from '@/app/api/studio/novel/_shared/normalize-plan';
import { NOVEL_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/novel/_shared/task-constants';
import type { NovelStepKey, NovelTaskStepRecord } from '@/app/api/studio/novel/_shared/task-types';
import type {
  NovelCast,
  NovelIdeaFile,
  NovelPlan,
  NovelTense,
} from '@/app/api/studio/novel/_shared/types';
import type { ProductDocUploadItem } from '@/app/studio/_components/ProductDocsUpload';
import {
  formatStyleSelections,
  hasStyleAxis,
  parseStyleSelections,
} from '@/app/studio/_components/StyleDimensionPicker';
import { readUploadItemAsDataUrl, serializeUploadItem } from '@/app/studio/_utils/upload-items';
import { apiDelete, apiPut } from '@/lib/client/api-client';
import { NARRATOR_AXIS_LABELS } from './constants';
import type {
  CastGenerated,
  CastStepSnapshot,
  ChaptersSnapshot,
  ChaptersStepSnapshot,
  NovelCharacter,
  NovelCharacterArc,
  NovelCharacterGender,
  NovelCharacterRole,
  NovelRelation,
  PlanStepSnapshot,
  ResearchStepSnapshot,
  StructureChapter,
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

export type ResolvedWritingUnit = {
  unitId: string;
  label: string;
  chapter: StructureChapter;
  previous: StructureChapter[];
  next?: StructureChapter;
};

/** 按创作方案的卷序展开已有章卡。 */
export function listStructureChapters(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
): StructureChapter[] {
  if (!plan || !chapters) return [];
  return plan.volumes.flatMap((volume) => {
    const match = chapters.volumes.find((item) => item.id === volume.id);
    return match?.chapters ?? [];
  });
}

/** 至少有一卷已经生成章卡。 */
export function areVolumesReadyForWrite(chapters: ChaptersSnapshot | undefined): boolean {
  return Boolean(chapters?.volumes.some((volume) => volume.chapters.length > 0));
}

/** 下一步写作要求当前选中的卷已经有章卡。 */
export function isSelectedVolumeReadyForWrite(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
): boolean {
  const volumeId = chapters?.selectedVolumeId;
  if (!volumeId || !plan?.volumes.some((volume) => volume.id === volumeId)) return false;
  return Boolean(chapters.volumes.find((volume) => volume.id === volumeId)?.chapters.length);
}

/**
 * 写作步只操作选中卷的章。
 * 没选中、或选中卷已不在快照里时沿用全书，避免旧任务一进写作就丢章节。
 */
export function writingChapterIds(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
): string[] {
  const all = listStructureChapters(plan, chapters).map((chapter) => chapter.id);
  const volumeId = chapters?.selectedVolumeId;
  if (!volumeId || !chapters) return all;
  const volume = chapters.volumes.find((item) => item.id === volumeId);
  if (!volume || volume.chapters.length === 0) return all;
  const allowed = new Set(volume.chapters.map((chapter) => chapter.id));
  return all.filter((id) => allowed.has(id));
}

/** 写作左栏章节。选中卷时只列出该卷，序号仍按全书计数。 */
export function visibleWritingChapters(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
): { chapter: StructureChapter; number: number }[] {
  if (!plan) return [];
  const allowed = new Set(writingChapterIds(plan, chapters));
  const visible: { chapter: StructureChapter; number: number }[] = [];
  let number = 0;
  for (const volume of plan.volumes) {
    const volumeChapters = chapters?.volumes.find((item) => item.id === volume.id)?.chapters ?? [];
    for (const chapter of volumeChapters) {
      number += 1;
      if (allowed.has(chapter.id)) visible.push({ chapter, number });
    }
  }
  return visible;
}

/** 至少有一层秩序写清了问题，并有一条写清运作方式的规则。 */
function hasReadyOrder(plan: NovelPlan): boolean {
  return plan.worldview.orders.some(
    (order) =>
      order.name.trim() &&
      order.question.trim() &&
      order.entries.some((entry) => entry.name.trim() && entry.rule.trim()),
  );
}

/**
 * 创作方案能否进入角色步。
 * 需要世界观里的秩序与隐藏真相、终局、主题、2～4 条主线，且每卷写了人物推进和卷末钩子。
 */
export function isPlanReady(plan: NovelPlan | undefined): boolean {
  if (!plan || plan.volumes.length === 0) return false;
  const threadCount = plan.threads.length;
  if (threadCount < NOVEL_THREAD_COUNT_MIN || threadCount > NOVEL_THREAD_COUNT_MAX) return false;
  if (!hasReadyOrder(plan) || !plan.worldview.hiddenTruth.trim()) return false;
  if (!plan.ending.trim() || !plan.theme.trim()) return false;
  const volumesOk = plan.volumes.every(
    (volume) =>
      volume.title.trim() &&
      volume.geography.trim() &&
      volume.conflict.trim() &&
      volume.relations.trim() &&
      volume.hook.trim() &&
      volume.targetChars > 0,
  );
  const threadsOk = plan.threads.every((thread) => thread.name.trim() && thread.core.trim());
  return volumesOk && threadsOk;
}

/** 新生成的方案是否可以落盘。缺秩序、隐藏真相、终局、主题或卷末钩子时当作没解析到。 */
export function isFreshPlanComplete(plan: NovelPlan): boolean {
  return isPlanReady(plan);
}

/** 按当前章卡对齐写作 units，保留已有正文。 */
export function syncWritingUnits(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
  prev?: WritingSnapshot,
): WritingSnapshot {
  const prevMap = new Map((prev?.units ?? []).map((unit) => [unit.unitId, unit.body]));
  const units: WritingUnit[] = listStructureChapters(plan, chapters).map((chapter) => ({
    unitId: chapter.id,
    body: prevMap.get(chapter.id) ?? '',
  }));
  const valid = new Set(units.map((unit) => unit.unitId));
  const selectedUnitIds = (prev?.selectedUnitIds ?? []).filter((id) => valid.has(id));
  const focusUnitId =
    prev?.focusUnitId && selectedUnitIds.includes(prev.focusUnitId) ? prev.focusUnitId : undefined;
  return {
    units,
    ...(prev?.styleSelections && Object.keys(prev.styleSelections).length
      ? { styleSelections: prev.styleSelections }
      : {}),
    ...(prev?.tense ? { tense: prev.tense } : {}),
    ...(selectedUnitIds.length ? { selectedUnitIds } : {}),
    ...(focusUnitId ? { focusUnitId } : {}),
  };
}

/** 写作快照是否与上次落盘一致。 */
export function isSameWriteSnapshot(
  prev: WritingSnapshot | undefined,
  next: WritingSnapshot | undefined,
): boolean {
  if (prev === next) return true;
  if (!prev || !next) return false;
  return JSON.stringify(snapshotKey(prev)) === JSON.stringify(snapshotKey(next));
}

function snapshotKey(snapshot: WritingSnapshot) {
  return {
    units: snapshot.units.map((unit) => [unit.unitId, unit.body]),
    styleSelections: snapshot.styleSelections ?? null,
    tense: snapshot.tense ?? null,
    selectedUnitIds: snapshot.selectedUnitIds ?? [],
    focusUnitId: snapshot.focusUnitId ?? null,
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

/** 按正文换行拆成展示段落，同时兼容历史数据中的连续空行。 */
export function splitWritingParagraphs(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** 解析章节 unitId 的展示与生成上下文。选中卷时，前章和下一章只看这一卷，章序仍按全书。 */
export function resolveWritingUnit(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
  unitId: string,
): ResolvedWritingUnit | undefined {
  const list = listStructureChapters(plan, chapters);
  const index = list.findIndex((chapter) => chapter.id === unitId);
  if (index < 0) return undefined;
  const allowed = new Set(writingChapterIds(plan, chapters));
  if (!allowed.has(unitId)) return undefined;
  const scoped = list.filter((chapter) => allowed.has(chapter.id));
  const localIndex = scoped.findIndex((chapter) => chapter.id === unitId);
  const chapter = list[index]!;
  const titleName = stripChapterPrefix(chapter.title);
  return {
    unitId,
    label: `${formatChapterPrefix(index + 1)}${titleName ? `　${titleName}` : ''}`,
    chapter,
    previous: scoped.slice(0, localIndex),
    next: scoped[localIndex + 1],
  };
}

/** 切换写作章节。始终单选。 */
export function toggleWritingSelection(
  validIds: readonly string[],
  prevSelected: string[],
  unitId: string,
): string[] {
  if (!validIds.includes(unitId)) return prevSelected;
  return prevSelected.includes(unitId) ? [] : [unitId];
}

/** 返回仍存在的选中章节。 */
export function resolveGenerateUnitIds(
  validIds: readonly string[],
  selectedUnitIds: string[],
): string[] {
  const valid = new Set(validIds);
  return selectedUnitIds.filter(
    (id, index) => valid.has(id) && selectedUnitIds.indexOf(id) === index,
  );
}

/**
 * 判断章节能否生成：已有正文可重生成；新章节须等所有前章都有正文。
 */
export function canGenerateWritingUnit(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
  writing: WritingSnapshot,
  unitId: string,
): boolean {
  const resolved = resolveWritingUnit(plan, chapters, unitId);
  if (!resolved) return false;
  if (
    !resolved.chapter.scene.trim() ||
    !resolved.chapter.event.trim() ||
    !resolved.chapter.hook.trim()
  ) {
    return false;
  }
  const bodyById = new Map(writing.units.map((unit) => [unit.unitId, unit.body.trim()]));
  if (bodyById.get(unitId)) return true;
  return resolved.previous.every((chapter) => bodyById.get(chapter.id));
}

export type WritingEditorBlock = {
  unitId: string;
  label: string;
  body: string;
  canGenerate: boolean;
};

export type PreviewSection = {
  chapterLabel?: string;
  paragraphs: string[];
};

export type PreviewDocument = {
  sections: PreviewSection[];
  plainText: string;
};

/** 按全书顺序组装预览文稿。 */
export function buildPreviewDocument(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
  writing: WritingSnapshot,
): PreviewDocument {
  const bodyOf = (unitId: string) =>
    writing.units.find((unit) => unit.unitId === unitId)?.body.trim() ?? '';
  const sections: PreviewSection[] = [];
  const plainParts: string[] = [];
  listStructureChapters(plan, chapters).forEach((chapter, chapterIndex) => {
    const body = bodyOf(chapter.id);
    if (!body) return;
    const titleName = stripChapterPrefix(chapter.title);
    const chapterLabel = `${formatChapterPrefix(chapterIndex + 1)}${titleName ? `　${titleName}` : ''}`;
    sections.push({ chapterLabel, paragraphs: splitWritingParagraphs(body) });
    plainParts.push(`${chapterLabel}\n\n${body}`);
  });
  return { sections, plainText: plainParts.join('\n\n\n') };
}

/** 复制纯文本到剪贴板。 */
export async function copyText(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/** 为当前选中章节构建正文编辑块。 */
export function buildWritingEditorBlocks(
  plan: NovelPlan | undefined,
  chapters: ChaptersSnapshot | undefined,
  writing: WritingSnapshot,
  selectedUnitIds: string[],
): WritingEditorBlock[] {
  const valid = writingChapterIds(plan, chapters);
  const unitId = resolveGenerateUnitIds(valid, selectedUnitIds)[0];
  if (!unitId) return [];
  const resolved = resolveWritingUnit(plan, chapters, unitId);
  if (!resolved) return [];
  return [
    {
      unitId,
      label: resolved.label,
      body: writing.units.find((unit) => unit.unitId === unitId)?.body ?? '',
      canGenerate: canGenerateWritingUnit(plan, chapters, writing, unitId),
    },
  ];
}

/** 流式展示用：去掉末尾 ```json 围栏（含尚未闭合的）。 */
export function stripTrailingJsonFenceForDisplay(text: string): string {
  const complete = text.match(/```json\s*[\s\S]*?```\s*$/i);
  if (complete?.index != null) return text.slice(0, complete.index).trimEnd();
  const open = /```json\b/i.exec(text);
  if (open?.index != null) return text.slice(0, open.index).trimEnd();
  return text;
}

/** 拆分流式全文末尾的 JSON 代码块。 */
export function extractTrailingJsonBlock(text: string): { prose: string; json: unknown | null } {
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
  for (const key of ['"topics"', '"characters"', '"worldview"', '"threads"', '"chapters"']) {
    const index = text.lastIndexOf(key);
    if (index < 0) continue;
    const start = text.lastIndexOf('{', index);
    if (start < 0) continue;
    try {
      return { prose: text.slice(0, start).trim(), json: JSON.parse(text.slice(start)) as unknown };
    } catch {
      /* 下一种键 */
    }
  }
  return { prose: text.trim(), json: null };
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
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

function parseCharacterRole(value: unknown): NovelCharacterRole | undefined {
  if (value === 'protagonist' || value === 'antagonist' || value === 'supporting') return value;
  return undefined;
}

function parseCharacterGender(value: unknown): NovelCharacterGender | undefined {
  if (value === 'female' || value === 'male') return value;
  return undefined;
}

function parseArc(value: unknown): NovelCharacterArc | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const arc: NovelCharacterArc = {};
  for (const key of ['early', 'mid', 'late', 'end'] as const) {
    const text = asString(record[key]);
    if (text) arc[key] = text;
  }
  return Object.keys(arc).length > 0 ? arc : undefined;
}

function parseCharacter(value: unknown): NovelCharacter | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const name = asString(record.name);
  const role = parseCharacterRole(record.role);
  const origin = asString(record.origin) || asString(record.identity);
  const trait =
    asString(record.trait) ||
    [asString(record.desire), asString(record.flaw)].filter(Boolean).join('；') ||
    undefined;
  if (!id || !name || !role || !origin || !trait) return null;
  const gender = parseCharacterGender(record.gender);
  const arc = parseArc(record.arc);
  return { id, name, role, origin, trait, ...(gender ? { gender } : {}), ...(arc ? { arc } : {}) };
}

function parseRelationArc(value: unknown): NovelRelation['arc'] | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const arc: NonNullable<NovelRelation['arc']> = {};
  for (const key of ['early', 'mid', 'late'] as const) {
    const text = asString(record[key]);
    if (text) arc[key] = text;
  }
  return Object.keys(arc).length > 0 ? arc : undefined;
}

function parseRelation(value: unknown, characterIds: Set<string>): NovelRelation | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const fromId = asString(record.fromId);
  const toId = asString(record.toId);
  const label = asString(record.label);
  if (!fromId || !toId || !label || fromId === toId) return null;
  if (!characterIds.has(fromId) || !characterIds.has(toId)) return null;
  const arc = parseRelationArc(record.arc);
  return { fromId, toId, label, ...(arc ? { arc } : {}) };
}

/** 解析角色生成结果。旧字段 identity / desire / flaw 会映射到出身和特质。 */
export function parseCastPayload(json: unknown): CastGenerated | null {
  if (!json || typeof json !== 'object') return null;
  const record = json as Record<string, unknown>;
  if (!Array.isArray(record.characters)) return null;
  const characters = record.characters.map(parseCharacter).filter((item) => item !== null);
  if (characters.length === 0) return null;
  const ids = new Set(characters.map((item) => item.id));
  const relations = Array.isArray(record.relations)
    ? record.relations.map((item) => parseRelation(item, ids)).filter((item) => item !== null)
    : [];
  return { characters, relations };
}

function isCompleteCharacter(character: NovelCharacter): character is NovelCharacter & {
  gender: NovelCharacterGender;
} {
  return Boolean(
    character.name.trim() && character.gender && character.origin.trim() && character.trait.trim(),
  );
}

/** 是否已有可展示的角色草稿。 */
export function hasCastDraft(cast: CastStepSnapshot | undefined): boolean {
  return Boolean(cast && cast.characters.length > 0);
}

/** 角色是否足以进入卷章设计。 */
export function isCastReady(cast: CastStepSnapshot | undefined): boolean {
  return Boolean(cast?.characters.some(isCompleteCharacter));
}

/** 把角色快照压成下游请求体。 */
export function toCastRequest(cast: CastStepSnapshot | undefined): NovelCast | undefined {
  if (!isCastReady(cast) || !cast) return undefined;
  const characters = cast.characters.filter(isCompleteCharacter).map((character) => ({
    id: character.id.trim(),
    name: character.name.trim(),
    role: character.role,
    gender: character.gender,
    origin: character.origin.trim(),
    trait: character.trait.trim(),
    ...(character.arc ? { arc: character.arc } : {}),
  }));
  if (characters.length === 0) return undefined;
  const characterIds = new Set(characters.map((character) => character.id));
  return {
    characters,
    relations: cast.relations.filter(
      (relation) =>
        relation.label.trim() &&
        characterIds.has(relation.fromId) &&
        characterIds.has(relation.toId) &&
        relation.fromId !== relation.toId,
    ),
  };
}

/** 写作步的人称、聚焦是否都已选定。 */
export function hasNarration(writing: WritingSnapshot | undefined): boolean {
  if (!writing?.tense) return false;
  return NARRATOR_AXIS_LABELS.every((label) => hasStyleAxis(writing.styleSelections ?? {}, label));
}

/** 把写作步文风压成提示。含人称与聚焦。 */
export function writingStylePrompt(writing: WritingSnapshot | undefined): string {
  return formatStyleSelections(writing?.styleSelections ?? {}).trim();
}

/** 解析选题卡列表。 */
export function parseResearchTopics(json: unknown): TopicCard[] {
  if (!json || typeof json !== 'object') return [];
  const topics = (json as Record<string, unknown>).topics;
  if (!Array.isArray(topics)) return [];
  return topics.map(parseTopicCard).filter((item) => item !== null);
}

/** 解析创作方案。旧快照里的逐卷推进和本卷结果会收成卷末钩子。 */
export function parsePlanPayload(json: unknown): NovelPlan | null {
  return normalizeNovelPlan(json);
}

function parseChapter(value: unknown): StructureChapter | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const id = asString(record.id);
  const title = asString(record.title);
  const scene = asString(record.scene);
  const event = asString(record.event) || asString(record.purpose);
  const hook = asString(record.hook) || event;
  if (!id || !title || !scene || !event || !hook) return null;
  return { id, title, scene, event, hook };
}

/** 解析某一卷的章卡列表。旧章只有 purpose 时，事件与钩子都用它，场景需另有字段。 */
export function parseVolumeChaptersPayload(json: unknown): StructureChapter[] {
  if (!json || typeof json !== 'object') return [];
  const chapters = (json as Record<string, unknown>).chapters;
  if (!Array.isArray(chapters)) return [];
  return chapters
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const scene = asString(record.scene);
      if (!scene) return null;
      return parseChapter(item);
    })
    .filter((item) => item !== null);
}

function mediaTypeFromName(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'md') return 'text/markdown';
  return 'text/plain';
}

function uploadFileName(item: ProductDocUploadItem): string {
  return item.file?.name ?? item.name ?? '';
}

function uploadMediaType(item: ProductDocUploadItem): string {
  const filename = uploadFileName(item);
  return item.file?.type || item.mimeType || mediaTypeFromName(filename);
}

/** 把上传项收成请求体里的文件。读失败时抛出，由调用方提示。 */
export async function toNovelIdeaFileInput(
  items: ProductDocUploadItem[],
): Promise<NovelIdeaFile[]> {
  const files: NovelIdeaFile[] = [];
  for (const item of items) {
    const filename = uploadFileName(item);
    if (!filename) throw new Error('missing filename');
    const dataUrl = await readUploadItemAsDataUrl(item);
    files.push({
      filename,
      mediaType: uploadMediaType(item),
      dataUrl,
    });
  }
  return files;
}

export function readFormIdeaFiles(value: unknown): ProductDocUploadItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is ProductDocUploadItem => {
    if (!item || typeof item !== 'object') return false;
    const record = item as ProductDocUploadItem;
    return typeof record.uid === 'string' && typeof record.previewUrl === 'string';
  });
}

/** 落盘前把上传项收成可持久化的 data URL。 */
export async function serializeIdeaFiles(
  items: ProductDocUploadItem[],
): Promise<ProductDocUploadItem[]> {
  const stored: ProductDocUploadItem[] = [];
  for (const item of items) stored.push(await serializeUploadItem(item));
  return stored;
}

function isDurableIdeaFileUrl(url: string): boolean {
  return url.startsWith('data:') || url.startsWith('/api/studio/novel/');
}

function readStoredFiles(value: unknown, max: number): ProductDocUploadItem[] {
  if (!Array.isArray(value)) return [];
  const files: ProductDocUploadItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const name = asString(record.name) || asString(record.filename);
    const previewUrl = asString(record.previewUrl);
    if (!name || !previewUrl || !isDurableIdeaFileUrl(previewUrl)) continue;
    const mimeType =
      asString(record.mimeType) || asString(record.mediaType) || mediaTypeFromName(name);
    files.push({
      uid: asString(record.uid) || `stored-${files.length}-${name}`,
      name,
      mimeType,
      previewUrl,
    });
    if (files.length >= max) break;
  }
  return files;
}

/** 读取选题调研快照。旧的体量、赛道字段忽略。 */
export function readResearchStepSnapshot(data: unknown): ResearchStepSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const topics = Array.isArray(record.topics)
    ? record.topics.map(parseTopicCard).filter((item) => item !== null)
    : [];
  const idea = typeof record.idea === 'string' ? record.idea : '';
  const genres = Array.isArray(record.genres)
    ? record.genres.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : [];
  const selectedTopicId = asString(record.selectedTopicId);
  const streamText = asString(record.streamText);
  return {
    idea,
    ideaFiles: readStoredFiles(record.ideaFiles, NOVEL_MAX_IDEA_FILES),
    planFiles: readStoredFiles(record.planFiles, NOVEL_MAX_PLAN_FILES),
    genres,
    topics,
    reasoningEffort: readNovelReasoningEffort(record.reasoningEffort),
    ...(selectedTopicId && topics.some((topic) => topic.id === selectedTopicId)
      ? { selectedTopicId }
      : {}),
    ...(streamText ? { streamText } : {}),
  };
}

/** 读取角色快照，兼容旧人物字段。 */
export function readCastStepSnapshot(data: unknown): CastStepSnapshot | undefined {
  const parsed = parseCastPayload(data);
  return parsed ?? undefined;
}

/** 读取创作方案快照。 */
export function readPlanStepSnapshot(data: unknown): PlanStepSnapshot | undefined {
  const plan = parsePlanPayload(data);
  if (!plan) return undefined;
  const streamText =
    data && typeof data === 'object'
      ? asString((data as Record<string, unknown>).streamText)
      : undefined;
  return { ...plan, ...(streamText ? { streamText } : {}) };
}

/** 读取卷章快照。没有场景的旧章不收入。选中卷不在结果里时丢掉。 */
export function readChaptersStepSnapshot(data: unknown): ChaptersStepSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  const volumes = record.volumes;
  if (!Array.isArray(volumes)) return undefined;
  const parsed = volumes
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const id = asString(record.id);
      if (!id || !Array.isArray(record.chapters)) return null;
      const chapters = record.chapters
        .map((chapter) => {
          if (!chapter || typeof chapter !== 'object') return null;
          if (!asString((chapter as Record<string, unknown>).scene)) return null;
          return parseChapter(chapter);
        })
        .filter((chapter) => chapter !== null);
      if (chapters.length === 0) return null;
      return { id, chapters };
    })
    .filter((item) => item !== null);
  if (parsed.length === 0) return undefined;
  const selectedVolumeId = asString(record.selectedVolumeId);
  return {
    volumes: parsed,
    ...(selectedVolumeId && parsed.some((volume) => volume.id === selectedVolumeId)
      ? { selectedVolumeId }
      : {}),
  };
}

function parseTense(value: unknown): NovelTense | undefined {
  return value === 'past' || value === 'present' ? value : undefined;
}

/** 读取写作快照。 */
export function readWriteStepSnapshot(data: unknown): WriteStepSnapshot | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if (!Array.isArray(record.units)) return undefined;
  const units: WritingUnit[] = [];
  for (const item of record.units) {
    if (!item || typeof item !== 'object') continue;
    const unit = item as Record<string, unknown>;
    const unitId = asString(unit.unitId);
    if (!unitId) continue;
    units.push({ unitId, body: typeof unit.body === 'string' ? unit.body : '' });
  }
  const styleSelections = parseStyleSelections(record.styleSelections);
  const selectedUnitIds = Array.isArray(record.selectedUnitIds)
    ? record.selectedUnitIds.filter(
        (item): item is string => typeof item === 'string' && item.trim().length > 0,
      )
    : [];
  const focusUnitId = asString(record.focusUnitId);
  const tense = parseTense(record.tense);
  return {
    units,
    ...(Object.keys(styleSelections).length ? { styleSelections } : {}),
    ...(tense ? { tense } : {}),
    ...(selectedUnitIds.length ? { selectedUnitIds } : {}),
    ...(focusUnitId && selectedUnitIds.includes(focusUnitId) ? { focusUnitId } : {}),
  };
}

/** 打开任务时停在最远的已有步骤。 */
export function resolveInitialPhase(input: {
  research?: ResearchStepSnapshot;
  plan?: PlanStepSnapshot;
  cast?: CastStepSnapshot;
  chapters?: ChaptersSnapshot;
  writing?: WritingSnapshot;
}): StudioPhase {
  if (hasWritingBody(input.writing)) return 'written';
  if (areVolumesReadyForWrite(input.chapters)) return 'chaptered';
  if (hasCastDraft(input.cast)) return 'casted';
  if (input.plan) return 'planned';
  if (input.research?.topics.length) return 'researched';
  return 'research';
}

/** 落盘小说步骤快照，返回服务端处理后的 data。 */
export async function saveNovelStep<T>(taskId: string, stepKey: NovelStepKey, data: T): Promise<T> {
  const record = await apiPut<NovelTaskStepRecord>(
    `/api/studio/novel/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    { snapshotVersion: NOVEL_STEP_SNAPSHOT_VERSION, data },
  );
  return record.data as T;
}

/** 删除小说步骤快照；不存在时服务端仍返回成功信封。 */
export async function deleteNovelStep(taskId: string, stepKey: NovelStepKey): Promise<void> {
  await apiDelete(`/api/studio/novel/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`);
}
