'use client';

import { App, Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import type { NovelTaskDetail } from '@/app/api/studio/novel/_shared/task-types';
import {
  formatStyleSelections,
  type StyleDimensionSelections,
} from '@/app/studio/_components/StyleDimensionPicker';
import { validateForm } from '@/app/studio/_utils/form-validate';
import {
  CHAPTER_BEATS_FAILED,
  CHAPTER_BEATS_REGENERATE_CONFIRM_CONTENT,
  CHAPTER_BEATS_REGENERATE_CONFIRM_TITLE,
  CONFIRM_CANCEL,
  CONFIRM_OK,
  COPY_BODY_FAILED,
  COPY_BODY_OK,
  DEFAULT_PANEL_VALUES,
  MISSING_IDEA_WARNING,
  MISSING_PREVIEW_BODY_WARNING,
  MISSING_STRUCTURE_WARNING,
  MISSING_TOPIC_WARNING,
  MISSING_VOLUME_CHAPTERS_WARNING,
  MISSING_WRITE_SELECTION_WARNING,
  RESEARCH_FAILED,
  RESEARCH_NO_TOPICS,
  RESEARCH_REGENERATE_CONFIRM_CONTENT,
  RESEARCH_REGENERATE_CONFIRM_TITLE,
  STRUCTURE_FAILED,
  STRUCTURE_REGENERATE_CONFIRM_CONTENT,
  STRUCTURE_REGENERATE_CONFIRM_TITLE,
  VOLUME_CHAPTERS_FAILED,
  VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT,
  VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE,
  WRITE_REGENERATE_CONFIRM_CONTENT,
  WRITE_REGENERATE_CONFIRM_TITLE,
  WRITING_FAILED,
} from '../constants';
import type {
  NovelLongFormat,
  NovelPanelValues,
  NovelVolume,
  ResearchStepSnapshot,
  StructureSnapshot,
  StructureStepSnapshot,
  StudioPhase,
  TopicCard,
  WritingSnapshot,
  WriteStepSnapshot,
} from '../types';
import {
  assertOkOrJsonFail,
  areVolumesReadyForWrite,
  buildPreviewDocument,
  consumeAnalyzeSse,
  copyText,
  createRafTextBuffer,
  extractTrailingJsonBlock,
  hasWritingBody,
  isAbortError,
  listStructureChapters,
  parseChapterBeatsPayload,
  parseResearchTopics,
  parseStructurePayload,
  parseVolumeChaptersPayload,
  readResearchStepSnapshot,
  readStructureStepSnapshot,
  readWriteStepSnapshot,
  resolveGenerateUnitIds,
  resolveInitialPhase,
  resolveWritingUnit,
  saveNovelStep,
  deleteNovelStep,
  stripTrailingJsonFenceForDisplay,
  syncWritingUnits,
  toggleWritingSelection,
} from '../utils';

function isNovelVolume(value: unknown): value is NovelVolume {
  return value === 'short' || value === 'medium' || value === 'long';
}

function isNovelLongFormat(value: unknown): value is NovelLongFormat {
  return value === 'publish' || value === 'web';
}

/** 仅长篇附带赛道字段；短中篇不传，保持原算法。 */
function longFormatBody(panel: NovelPanelValues): { longFormat?: NovelLongFormat } {
  return panel.volume === 'long' ? { longFormat: panel.longFormat } : {};
}

function toStructureSnapshot(step: StructureStepSnapshot): StructureSnapshot {
  if (step.kind === 'short') {
    return { kind: 'short', synopsis: step.synopsis, beats: step.beats };
  }
  if (step.kind === 'volumes') {
    return { kind: 'volumes', volumes: step.volumes };
  }
  return { kind: 'chapters', chapters: step.chapters };
}

/** 管理小说四步：调研 → 结构 → 写作 → 预览；生成走 SSE，步骤落盘。 */
export function useNovelStudio(task: NovelTaskDetail) {
  const { message, modal } = App.useApp();
  const initialResearch = readResearchStepSnapshot(task.steps.research?.data);
  const initialStructure = readStructureStepSnapshot(task.steps.structure?.data);
  const initialWrite = readWriteStepSnapshot(task.steps.write?.data);

  const [panelForm] = Form.useForm<NovelPanelValues>();
  const [panelInitialValues] = useState<NovelPanelValues>(() => ({
    idea: initialResearch?.idea ?? DEFAULT_PANEL_VALUES.idea,
    genres: initialResearch?.genres ?? DEFAULT_PANEL_VALUES.genres,
    volume: initialResearch?.volume ?? DEFAULT_PANEL_VALUES.volume,
    longFormat: initialResearch?.longFormat ?? DEFAULT_PANEL_VALUES.longFormat,
  }));
  const [phase, setPhase] = useState<StudioPhase>(() => resolveInitialPhase(initialResearch));
  const [topics, setTopics] = useState<TopicCard[]>(initialResearch?.topics ?? []);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(
    initialResearch?.selectedTopicId,
  );
  const [structure, setStructure] = useState<StructureSnapshot | undefined>(() =>
    initialStructure ? toStructureSnapshot(initialStructure) : undefined,
  );
  const [writing, setWriting] = useState<WritingSnapshot | undefined>(initialWrite);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [focusUnitId, setFocusUnitId] = useState<string | undefined>();
  const [generatingChapterId, setGeneratingChapterId] = useState<string | undefined>();
  const [generatingVolumeId, setGeneratingVolumeId] = useState<string | undefined>();
  const [generatingUnitIds, setGeneratingUnitIds] = useState<string[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const structureRef = useRef(structure);
  const writingRef = useRef(writing);
  const topicsRef = useRef(topics);
  const selectedTopicIdRef = useRef(selectedTopicId);

  useEffect(() => {
    structureRef.current = structure;
  }, [structure]);
  useEffect(() => {
    writingRef.current = writing;
  }, [writing]);
  useEffect(() => {
    topicsRef.current = topics;
  }, [topics]);
  useEffect(() => {
    selectedTopicIdRef.current = selectedTopicId;
  }, [selectedTopicId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);

  function confirmOverwrite(title: string, content: string): Promise<boolean> {
    return new Promise((resolve) => {
      modal.confirm({
        title,
        content,
        okText: CONFIRM_OK,
        cancelText: CONFIRM_CANCEL,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  function readPanelValues(): NovelPanelValues {
    // true：包含已卸载 Form.Item（切到结构/写作步后 idea/volume 不再挂载）
    const values = panelForm.getFieldsValue(true);
    const idea = String(values.idea ?? '').trim() || initialResearch?.idea || '';
    const genres = Array.isArray(values.genres)
      ? values.genres.map((item: unknown) => String(item).trim()).filter(Boolean)
      : (initialResearch?.genres ?? []);
    const volume = isNovelVolume(values.volume)
      ? values.volume
      : (initialResearch?.volume ?? 'short');
    const longFormat = isNovelLongFormat(values.longFormat)
      ? values.longFormat
      : (initialResearch?.longFormat ?? 'publish');
    return { idea, genres, volume, longFormat };
  }

  async function persistResearch(
    next: ResearchStepSnapshot,
  ): Promise<ResearchStepSnapshot | undefined> {
    try {
      return await saveNovelStep(task.id, 'research', next);
    } catch (err) {
      console.error('[novel-studio] persist research', err);
      return undefined;
    }
  }

  async function persistStructure(
    next: StructureStepSnapshot,
  ): Promise<StructureStepSnapshot | undefined> {
    try {
      return await saveNovelStep(task.id, 'structure', next);
    } catch (err) {
      console.error('[novel-studio] persist structure', err);
      return undefined;
    }
  }

  async function persistWrite(next: WriteStepSnapshot): Promise<WriteStepSnapshot | undefined> {
    try {
      return await saveNovelStep(task.id, 'write', next);
    } catch (err) {
      console.error('[novel-studio] persist write', err);
      return undefined;
    }
  }

  /** 重新生成上游步骤时清掉下游落盘，避免刷新后错误 hydrate。 */
  async function clearDownstreamSteps(from: 'research' | 'structure') {
    try {
      if (from === 'research') {
        await deleteNovelStep(task.id, 'structure');
        await deleteNovelStep(task.id, 'write');
        return;
      }
      await deleteNovelStep(task.id, 'write');
    } catch (err) {
      console.error('[novel-studio] clear downstream steps', err);
    }
  }

  async function runSse(
    url: string,
    body: unknown,
    buffer: ReturnType<typeof createRafTextBuffer>,
    failedMessage: string,
    onDone: (fullText: string) => Promise<void> | void,
    busyPhase: StudioPhase,
    idlePhase: StudioPhase,
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase(busyPhase);
    buffer.reset();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      let receivedDone = false;
      await consumeAnalyzeSse(res, {
        onText: (delta) => buffer.append(delta),
        onDone: () => {
          receivedDone = true;
        },
        onError: (text) => message.error(text),
      });
      buffer.flushNow();
      if (controller.signal.aborted) return;
      if (receivedDone) {
        await onDone(buffer.getText());
        return;
      }
      setPhase(idlePhase);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[novel-studio]', url, err);
      message.error(err instanceof Error && err.message ? err.message : failedMessage);
      setPhase(idlePhase);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  /** 开始调研：已有选题时先确认，再 SSE 产出选题卡并落盘。 */
  async function handleResearch() {
    if (!(await validateForm(panelForm))) return;
    const panel = readPanelValues();
    if (!panel.idea) {
      message.warning(MISSING_IDEA_WARNING);
      return;
    }

    if (topics.length > 0) {
      const confirmed = await confirmOverwrite(
        RESEARCH_REGENERATE_CONFIRM_TITLE,
        RESEARCH_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    abortRef.current?.abort();
    setSelectedTopicId(undefined);
    setTopics([]);
    setStructure(undefined);
    setWriting(undefined);
    setSelectedUnitIds([]);
    setFocusUnitId(undefined);
    setGeneratingChapterId(undefined);
    setGeneratingVolumeId(undefined);
    await clearDownstreamSteps('research');

    const researchBuffer = createRafTextBuffer(() => {
      /* 选题调研过程文案不单独展示，仅用于解析 */
    });

    await runSse(
      '/api/studio/novel/research',
      {
        idea: panel.idea,
        volume: panel.volume,
        ...(panel.genres.length ? { genres: panel.genres } : {}),
        ...longFormatBody(panel),
      },
      researchBuffer,
      RESEARCH_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const nextTopics = parseResearchTopics(json);
        if (nextTopics.length === 0) {
          setTopics([]);
          setSelectedTopicId(undefined);
          setPhase('research');
          message.error(RESEARCH_NO_TOPICS);
          return;
        }
        setTopics(nextTopics);
        setSelectedTopicId(undefined);
        setPhase('researched');
        await persistResearch({
          idea: panel.idea,
          genres: panel.genres,
          volume: panel.volume,
          longFormat: panel.longFormat,
          topics: nextTopics,
          streamText: stripTrailingJsonFenceForDisplay(prose || fullText),
        });
      },
      'researching',
      'research',
    );
  }

  /** 点选选题卡并落盘。 */
  async function handleSelectTopic(id: string) {
    setSelectedTopicId(id);
    const panel = readPanelValues();
    const currentTopics = topicsRef.current;
    if (currentTopics.length === 0) return;
    await persistResearch({
      idea: panel.idea || initialResearch?.idea || '',
      genres: panel.genres,
      volume: panel.volume,
      longFormat: panel.longFormat,
      topics: currentTopics,
      selectedTopicId: id,
    });
  }

  /** 生成故事结构：已有结构时先确认；覆盖后清空写作。 */
  async function handleGenerateStructure() {
    if (!selectedTopicId || !selectedTopic) {
      message.warning(MISSING_TOPIC_WARNING);
      return;
    }

    if (structure) {
      const confirmed = await confirmOverwrite(
        STRUCTURE_REGENERATE_CONFIRM_TITLE,
        STRUCTURE_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const panel = readPanelValues();
    const hadStructure = Boolean(structure);
    setWriting(undefined);
    setSelectedUnitIds([]);
    setFocusUnitId(undefined);
    setGeneratingChapterId(undefined);
    setGeneratingVolumeId(undefined);
    setStructure(undefined);
    await clearDownstreamSteps('structure');

    const structureBuffer = createRafTextBuffer(() => {
      /* 结构过程文案不单独展示 */
    });

    await runSse(
      '/api/studio/novel/structure',
      {
        idea: panel.idea,
        volume: panel.volume,
        topic: selectedTopic,
        ...(panel.genres.length ? { genres: panel.genres } : {}),
        ...longFormatBody(panel),
      },
      structureBuffer,
      STRUCTURE_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const parsed = parseStructurePayload(json);
        if (!parsed) {
          setStructure(undefined);
          setPhase('structure');
          message.error(STRUCTURE_FAILED);
          return;
        }
        setStructure(parsed);
        setPhase('structured');
        await persistStructure({
          ...parsed,
          streamText: stripTrailingJsonFenceForDisplay(prose || fullText),
        });
      },
      'structuring',
      hadStructure ? 'structured' : 'structure',
    );
  }

  /** 为指定卷生成/覆盖章纲。 */
  async function handleGenerateVolumeChapters(volumeId: string) {
    if (!structure || structure.kind !== 'volumes' || !selectedTopic) return;
    const volume = structure.volumes.find((item) => item.id === volumeId);
    if (!volume) return;

    if (volume.chapters.length > 0) {
      const confirmed = await confirmOverwrite(
        VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE,
        VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeneratingVolumeId(volumeId);

    const buffer = createRafTextBuffer(() => {
      /* 章纲过程文案不单独展示 */
    });

    const existingChapterCount = structure.volumes
      .filter((item) => item.id !== volumeId)
      .reduce((sum, item) => sum + item.chapters.length, 0);

    try {
      const res = await fetch('/api/studio/novel/volume-chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          topic: selectedTopic,
          ...longFormatBody(readPanelValues()),
          volume: {
            id: volume.id,
            title: volume.title,
            purpose: volume.purpose,
          },
          existingChapterCount,
          siblingVolumes: structure.volumes
            .filter((item) => item.id !== volumeId)
            .map((item) => ({
              id: item.id,
              title: item.title,
              purpose: item.purpose,
            })),
        }),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      let receivedDone = false;
      await consumeAnalyzeSse(res, {
        onText: (delta) => buffer.append(delta),
        onDone: () => {
          receivedDone = true;
        },
        onError: (text) => message.error(text),
      });
      buffer.flushNow();
      if (controller.signal.aborted) return;
      if (!receivedDone) return;

      const { json } = extractTrailingJsonBlock(buffer.getText());
      const chapters = parseVolumeChaptersPayload(json);
      if (chapters.length === 0) {
        message.error(VOLUME_CHAPTERS_FAILED);
        return;
      }

      const prev = structureRef.current;
      if (!prev || prev.kind !== 'volumes') return;
      const nextStructure: StructureSnapshot = {
        ...prev,
        volumes: prev.volumes.map((item) => (item.id === volumeId ? { ...item, chapters } : item)),
      };
      setStructure(nextStructure);
      setWriting((prevWriting) => syncWritingUnits(nextStructure, prevWriting));
      await persistStructure(nextStructure);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[novel-studio] volume-chapters', err);
      message.error(err instanceof Error && err.message ? err.message : VOLUME_CHAPTERS_FAILED);
    } finally {
      setGeneratingVolumeId(undefined);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  /** 为指定章生成/覆盖章内节拍。 */
  async function handleGenerateChapterBeats(chapterId: string) {
    if (!structure || (structure.kind !== 'chapters' && structure.kind !== 'volumes')) {
      return;
    }
    if (!selectedTopic) return;
    const chapters = listStructureChapters(structure);
    const chapter = chapters.find((item) => item.id === chapterId);
    if (!chapter) return;

    if (chapter.beats.length > 0) {
      const confirmed = await confirmOverwrite(
        CHAPTER_BEATS_REGENERATE_CONFIRM_TITLE,
        CHAPTER_BEATS_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeneratingChapterId(chapterId);

    const buffer = createRafTextBuffer(() => {
      /* 节拍过程文案不单独展示 */
    });

    try {
      const res = await fetch('/api/studio/novel/chapter-beats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({
          topic: selectedTopic,
          ...(structure.kind === 'volumes' ? longFormatBody(readPanelValues()) : {}),
          chapter: {
            id: chapter.id,
            title: chapter.title,
            purpose: chapter.purpose,
          },
          siblingChapters: chapters
            .filter((item) => item.id !== chapterId)
            .map((item) => ({
              id: item.id,
              title: item.title,
              purpose: item.purpose,
            })),
        }),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      let receivedDone = false;
      await consumeAnalyzeSse(res, {
        onText: (delta) => buffer.append(delta),
        onDone: () => {
          receivedDone = true;
        },
        onError: (text) => message.error(text),
      });
      buffer.flushNow();
      if (controller.signal.aborted) return;
      if (!receivedDone) return;

      const { json } = extractTrailingJsonBlock(buffer.getText());
      const beats = parseChapterBeatsPayload(json);
      if (beats.length === 0) {
        message.error(CHAPTER_BEATS_FAILED);
        return;
      }

      const prev = structureRef.current;
      if (!prev) return;
      let nextStructure: StructureSnapshot | undefined;
      if (prev.kind === 'chapters') {
        nextStructure = {
          ...prev,
          chapters: prev.chapters.map((item) =>
            item.id === chapterId ? { ...item, beats } : item,
          ),
        };
      } else if (prev.kind === 'volumes') {
        nextStructure = {
          ...prev,
          volumes: prev.volumes.map((vol) => ({
            ...vol,
            chapters: vol.chapters.map((item) =>
              item.id === chapterId ? { ...item, beats } : item,
            ),
          })),
        };
      }
      if (!nextStructure) return;
      setStructure(nextStructure);
      setWriting((prevWriting) => syncWritingUnits(nextStructure!, prevWriting));
      await persistStructure(nextStructure);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[novel-studio] chapter-beats', err);
      message.error(err instanceof Error && err.message ? err.message : CHAPTER_BEATS_FAILED);
    } finally {
      setGeneratingChapterId(undefined);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  /** 上一步：预览→写作；写作→结构；结构→调研。 */
  function handlePrev() {
    if (phase === 'preview') {
      setPhase(hasWritingBody(writing) ? 'written' : 'write');
      return;
    }
    if (phase === 'write' || phase === 'writing' || phase === 'written') {
      abortRef.current?.abort();
      setPhase('structured');
      return;
    }
    if (phase === 'structure' || phase === 'structuring' || phase === 'structured') {
      abortRef.current?.abort();
      setGeneratingChapterId(undefined);
      setGeneratingVolumeId(undefined);
      setPhase('researched');
    }
  }

  /** 下一步：调研→结构；结构→写作；写作→预览。 */
  async function handleNext() {
    if (phase === 'researched') {
      if (!selectedTopicId) return;
      setPhase(structure ? 'structured' : 'structure');
      return;
    }

    if (phase === 'structure' || phase === 'structuring') {
      message.warning(MISSING_STRUCTURE_WARNING);
      return;
    }

    if (phase === 'structured') {
      if (!structure) {
        message.warning(MISSING_STRUCTURE_WARNING);
        return;
      }
      if (!areVolumesReadyForWrite(structure)) {
        message.warning(MISSING_VOLUME_CHAPTERS_WARNING);
        return;
      }
      await persistStructure(structure);
      const nextWriting = syncWritingUnits(structure, writing);
      setWriting(nextWriting);
      setSelectedUnitIds([]);
      setFocusUnitId(undefined);
      setPhase(hasWritingBody(nextWriting) ? 'written' : 'write');
      await persistWrite(nextWriting);
      return;
    }

    if (phase === 'write' || phase === 'writing' || phase === 'written') {
      if (!hasWritingBody(writing)) {
        message.warning(MISSING_PREVIEW_BODY_WARNING);
        return;
      }
      abortRef.current?.abort();
      if (writing) await persistWrite(writing);
      setPhase('preview');
    }
  }

  /** 一键复制预览正文（全结构非空节拍，含章标题）。 */
  async function handleCopyPreview() {
    if (!structure || !writing) return;
    const { plainText } = buildPreviewDocument(structure, writing);
    if (!plainText.trim()) {
      message.warning(MISSING_PREVIEW_BODY_WARNING);
      return;
    }
    try {
      await copyText(plainText);
      message.success(COPY_BODY_OK);
    } catch {
      message.error(COPY_BODY_FAILED);
    }
  }

  /** 切换写作单元选中（章单选 / 同章节拍多选）。 */
  function toggleWritingUnit(unitId: string) {
    if (!structure) return;
    setSelectedUnitIds((prev) => {
      const next = toggleWritingSelection(structure, prev, unitId);
      setFocusUnitId(next.includes(unitId) ? unitId : next.at(-1));
      return next;
    });
  }

  /** 对指定单元串行 SSE 生成正文（仅节拍）；已有正文时先确认。 */
  async function handleGenerateWriting(unitIds: string[]) {
    if (!structure || !writing || !selectedTopic) return;

    const generateIds = resolveGenerateUnitIds(structure, unitIds);
    if (generateIds.length === 0) {
      message.warning(MISSING_WRITE_SELECTION_WARNING);
      return;
    }

    const hasExistingBody = generateIds.some((unitId) =>
      Boolean(writing.units.find((unit) => unit.unitId === unitId)?.body.trim()),
    );
    if (hasExistingBody) {
      const confirmed = await confirmOverwrite(
        WRITE_REGENERATE_CONFIRM_TITLE,
        WRITE_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const panel = readPanelValues();
    const stylePrompt = formatStyleSelections(writing.styleSelections ?? {}).trim();
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setWriting((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        units: prev.units.map((unit) =>
          generateIds.includes(unit.unitId) ? { ...unit, body: '' } : unit,
        ),
      };
    });
    setGeneratingUnitIds(generateIds);
    setPhase('writing');
    setFocusUnitId(generateIds[0] ?? focusUnitId);

    const bodies = new Map<string, string>();

    try {
      for (const unitId of generateIds) {
        if (controller.signal.aborted) return;
        const resolved = resolveWritingUnit(structure, unitId);
        if (!resolved || resolved.kind !== 'beat' || !resolved.beatText) continue;

        setFocusUnitId(unitId);
        const buffer = createRafTextBuffer((text) => {
          bodies.set(unitId, text);
          setWriting((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              units: prev.units.map((unit) =>
                unit.unitId === unitId ? { ...unit, body: text } : unit,
              ),
            };
          });
        });

        const res = await fetch('/api/studio/novel/writing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
          body: JSON.stringify({
            unitId,
            beatText: resolved.beatText,
            topic: selectedTopic,
            volume: panel.volume,
            ...longFormatBody(panel),
            ...(stylePrompt ? { stylePrompt } : {}),
            ...(resolved.chapterTitle ? { chapterTitle: resolved.chapterTitle } : {}),
            ...(resolved.chapterPurpose ? { chapterPurpose: resolved.chapterPurpose } : {}),
          }),
          signal: controller.signal,
        });
        await assertOkOrJsonFail(res);
        let receivedDone = false;
        await consumeAnalyzeSse(res, {
          onText: (delta) => buffer.append(delta),
          onDone: () => {
            receivedDone = true;
          },
          onError: (text) => message.error(text),
        });
        buffer.flushNow();
        if (controller.signal.aborted) return;
        if (!receivedDone) {
          setPhase('write');
          return;
        }
      }

      if (controller.signal.aborted) return;
      setPhase('written');
      const base = writingRef.current ?? writing;
      const nextWriting: WritingSnapshot = {
        ...base,
        units: base.units.map((unit) =>
          bodies.has(unit.unitId) ? { ...unit, body: bodies.get(unit.unitId) ?? '' } : unit,
        ),
      };
      setWriting(nextWriting);
      await persistWrite(nextWriting);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[novel-studio] writing', err);
      message.error(err instanceof Error && err.message ? err.message : WRITING_FAILED);
      setPhase(hasWritingBody(writingRef.current) ? 'written' : 'write');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setGeneratingUnitIds([]);
      }
    }
  }

  /** 更新指定单元正文（本地编辑；进入预览或重新生成时再落盘）。 */
  function updateWritingBody(unitId: string, body: string) {
    setFocusUnitId(unitId);
    setWriting((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        units: prev.units.map((unit) => (unit.unitId === unitId ? { ...unit, body } : unit)),
      };
    });
  }

  /** 更新正文文风并落盘；仅影响后续生成。 */
  function updateStyleSelections(next: StyleDimensionSelections) {
    setWriting((prev) => {
      if (!prev) return prev;
      const nextWriting: WritingSnapshot = {
        kind: prev.kind,
        units: prev.units,
        ...(Object.keys(next).length ? { styleSelections: next } : {}),
      };
      void persistWrite(nextWriting);
      return nextWriting;
    });
  }

  /** 更新短篇梗概（本地编辑；删除或下一步时再落盘）。 */
  function updateSynopsis(synopsis: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'short') return prev;
      return { ...prev, synopsis };
    });
  }

  /** 更新短篇某条节拍文案。 */
  function updateBeat(beatId: string, text: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'short') return prev;
      return {
        ...prev,
        beats: prev.beats.map((beat) => (beat.id === beatId ? { ...beat, text } : beat)),
      };
    });
  }

  /** 删除短篇节拍；至少保留一条。 */
  function removeBeat(beatId: string) {
    if (!structure || structure.kind !== 'short' || structure.beats.length <= 1) return;
    const next: StructureSnapshot = {
      ...structure,
      beats: structure.beats.filter((beat) => beat.id !== beatId),
    };
    setStructure(next);
    setWriting((prevWriting) => {
      const synced = prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting;
      if (synced) void persistWrite(synced);
      return synced;
    });
    setSelectedUnitIds((ids) => ids.filter((id) => id !== beatId));
    setFocusUnitId((current) => (current === beatId ? undefined : current));
    void persistStructure(next);
  }

  /** 更新卷标题或目的。 */
  function updateVolume(volumeId: string, patch: { title?: string; purpose?: string }) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'volumes') return prev;
      return {
        ...prev,
        volumes: prev.volumes.map((volume) =>
          volume.id === volumeId ? { ...volume, ...patch } : volume,
        ),
      };
    });
  }

  /** 删除卷；至少保留一卷。 */
  function removeVolume(volumeId: string) {
    if (!structure || structure.kind !== 'volumes' || structure.volumes.length <= 1) {
      return;
    }
    const removed = structure.volumes.find((volume) => volume.id === volumeId);
    const removedIds = new Set(
      (removed?.chapters ?? []).flatMap((chapter) => [
        chapter.id,
        ...chapter.beats.map((beat) => beat.id),
      ]),
    );
    const next: StructureSnapshot = {
      ...structure,
      volumes: structure.volumes.filter((volume) => volume.id !== volumeId),
    };
    setStructure(next);
    setWriting((prevWriting) => {
      const synced = prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting;
      if (synced) void persistWrite(synced);
      return synced;
    });
    setSelectedUnitIds((ids) => ids.filter((id) => !removedIds.has(id)));
    setFocusUnitId((current) => (current && removedIds.has(current) ? undefined : current));
    void persistStructure(next);
  }

  /** 更新章纲标题或目的。 */
  function updateChapter(chapterId: string, patch: { title?: string; purpose?: string }) {
    setStructure((prev) => {
      if (!prev) return prev;
      if (prev.kind === 'chapters') {
        return {
          ...prev,
          chapters: prev.chapters.map((chapter) =>
            chapter.id === chapterId ? { ...chapter, ...patch } : chapter,
          ),
        };
      }
      if (prev.kind === 'volumes') {
        return {
          ...prev,
          volumes: prev.volumes.map((volume) => ({
            ...volume,
            chapters: volume.chapters.map((chapter) =>
              chapter.id === chapterId ? { ...chapter, ...patch } : chapter,
            ),
          })),
        };
      }
      return prev;
    });
  }

  /** 更新章内某条节拍。 */
  function updateChapterBeat(chapterId: string, beatId: string, text: string) {
    setStructure((prev) => {
      if (!prev) return prev;
      if (prev.kind === 'chapters') {
        return {
          ...prev,
          chapters: prev.chapters.map((chapter) =>
            chapter.id === chapterId
              ? {
                  ...chapter,
                  beats: chapter.beats.map((beat) =>
                    beat.id === beatId ? { ...beat, text } : beat,
                  ),
                }
              : chapter,
          ),
        };
      }
      if (prev.kind === 'volumes') {
        return {
          ...prev,
          volumes: prev.volumes.map((volume) => ({
            ...volume,
            chapters: volume.chapters.map((chapter) =>
              chapter.id === chapterId
                ? {
                    ...chapter,
                    beats: chapter.beats.map((beat) =>
                      beat.id === beatId ? { ...beat, text } : beat,
                    ),
                  }
                : chapter,
            ),
          })),
        };
      }
      return prev;
    });
  }

  /** 删除章内节拍。 */
  function removeChapterBeat(chapterId: string, beatId: string) {
    if (!structure || (structure.kind !== 'chapters' && structure.kind !== 'volumes')) {
      return;
    }
    let next: StructureSnapshot;
    if (structure.kind === 'chapters') {
      next = {
        ...structure,
        chapters: structure.chapters.map((chapter) =>
          chapter.id === chapterId
            ? { ...chapter, beats: chapter.beats.filter((beat) => beat.id !== beatId) }
            : chapter,
        ),
      };
    } else {
      next = {
        ...structure,
        volumes: structure.volumes.map((volume) => ({
          ...volume,
          chapters: volume.chapters.map((chapter) =>
            chapter.id === chapterId
              ? { ...chapter, beats: chapter.beats.filter((beat) => beat.id !== beatId) }
              : chapter,
          ),
        })),
      };
    }
    setStructure(next);
    setWriting((prevWriting) => {
      const synced = prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting;
      if (synced) void persistWrite(synced);
      return synced;
    });
    setSelectedUnitIds((ids) => ids.filter((id) => id !== beatId));
    setFocusUnitId((current) => (current === beatId ? undefined : current));
    void persistStructure(next);
  }

  /** 删除章纲条目；中篇至少保留一章；长篇同卷至少保留一章。 */
  function removeChapter(chapterId: string) {
    if (!structure) return;
    if (structure.kind === 'chapters') {
      if (structure.chapters.length <= 1) return;
      const removed = structure.chapters.find((chapter) => chapter.id === chapterId);
      const removedIds = new Set([chapterId, ...(removed?.beats.map((beat) => beat.id) ?? [])]);
      const next: StructureSnapshot = {
        ...structure,
        chapters: structure.chapters.filter((chapter) => chapter.id !== chapterId),
      };
      setStructure(next);
      setWriting((prevWriting) => {
        const synced = prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting;
        if (synced) void persistWrite(synced);
        return synced;
      });
      setSelectedUnitIds((ids) => ids.filter((id) => !removedIds.has(id)));
      setFocusUnitId((current) => (current && removedIds.has(current) ? undefined : current));
      void persistStructure(next);
      return;
    }
    if (structure.kind !== 'volumes') return;
    const owner = structure.volumes.find((volume) =>
      volume.chapters.some((chapter) => chapter.id === chapterId),
    );
    if (!owner || owner.chapters.length <= 1) return;
    const removed = owner.chapters.find((chapter) => chapter.id === chapterId);
    const removedIds = new Set([chapterId, ...(removed?.beats.map((beat) => beat.id) ?? [])]);
    const next: StructureSnapshot = {
      ...structure,
      volumes: structure.volumes.map((volume) =>
        volume.id === owner.id
          ? {
              ...volume,
              chapters: volume.chapters.filter((chapter) => chapter.id !== chapterId),
            }
          : volume,
      ),
    };
    setStructure(next);
    setWriting((prevWriting) => {
      const synced = prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting;
      if (synced) void persistWrite(synced);
      return synced;
    });
    setSelectedUnitIds((ids) => ids.filter((id) => !removedIds.has(id)));
    setFocusUnitId((current) => (current && removedIds.has(current) ? undefined : current));
    void persistStructure(next);
  }

  return {
    panelForm,
    panelInitialValues,
    phase,
    topics,
    selectedTopicId,
    selectedTopic,
    structure,
    writing,
    selectedUnitIds,
    focusUnitId,
    generatingChapterId,
    generatingVolumeId,
    generatingUnitIds,
    handleResearch,
    handleSelectTopic,
    handleGenerateStructure,
    handleGenerateVolumeChapters,
    handleGenerateChapterBeats,
    handleGenerateWriting,
    handlePrev,
    handleNext,
    handleCopyPreview,
    toggleWritingUnit,
    updateWritingBody,
    updateStyleSelections,
    updateSynopsis,
    updateBeat,
    removeBeat,
    updateVolume,
    removeVolume,
    updateChapter,
    updateChapterBeat,
    removeChapterBeat,
    removeChapter,
  };
}
