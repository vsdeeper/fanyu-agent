'use client';

import { App, Form } from 'antd';
import { useRef, useState } from 'react';
import {
  CHAPTER_BEATS_REGENERATE_CONFIRM_CONTENT,
  CHAPTER_BEATS_REGENERATE_CONFIRM_TITLE,
  CONFIRM_CANCEL,
  CONFIRM_OK,
  DEFAULT_PANEL_VALUES,
  MOCK_CHAPTER_BEATS_DELAY_MS,
  MOCK_RESEARCH_DELAY_MS,
  MOCK_STRUCTURE_DELAY_MS,
  MOCK_WRITING_STREAM_STEP_MS,
  MOCK_WRITING_STREAM_STEPS,
  MISSING_IDEA_WARNING,
  MISSING_STRUCTURE_WARNING,
  MISSING_TOPIC_WARNING,
  MISSING_WRITE_SELECTION_WARNING,
  PREVIEW_STEP_COMING,
  RESEARCH_REGENERATE_CONFIRM_CONTENT,
  RESEARCH_REGENERATE_CONFIRM_TITLE,
  STRUCTURE_REGENERATE_CONFIRM_CONTENT,
  STRUCTURE_REGENERATE_CONFIRM_TITLE,
  WRITE_REGENERATE_CONFIRM_CONTENT,
  WRITE_REGENERATE_CONFIRM_TITLE,
} from '../constants';
import { getMockChapterBeats } from '../mock-chapter-beats';
import { getMockStructure } from '../mock-structure';
import { getMockWritingBody } from '../mock-writing';
import { MOCK_TOPICS } from '../mock-topics';
import type {
  NovelPanelValues,
  NovelVolume,
  StructureSnapshot,
  StudioPhase,
  TopicCard,
  WritingSnapshot,
} from '../types';
import {
  defaultSelectedUnitIds,
  hasWritingBody,
  resolveGenerateUnitIds,
  resolveWritingUnit,
  syncWritingUnits,
  toggleWritingSelection,
} from '../utils';

function isNovelVolume(value: unknown): value is NovelVolume {
  return value === 'short' || value === 'medium' || value === 'long';
}

/** 小说工作室纯客户端状态：选题调研 + 故事结构 + 写作 mock，无落盘、无请求。 */
export function useNovelStudio() {
  const { message, modal } = App.useApp();
  const [panelForm] = Form.useForm<NovelPanelValues>();
  const [phase, setPhase] = useState<StudioPhase>('research');
  const [topics, setTopics] = useState<TopicCard[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>();
  const [structure, setStructure] = useState<StructureSnapshot | undefined>();
  const [writing, setWriting] = useState<WritingSnapshot | undefined>();
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [focusUnitId, setFocusUnitId] = useState<string | undefined>();
  const [generatingChapterId, setGeneratingChapterId] = useState<string | undefined>();
  const researchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const structureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chapterBeatsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const writingStreamRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedTopic = topics.find((topic) => topic.id === selectedTopicId);

  function confirmOverwrite(title: string, content: string): Promise<boolean> {
    return new Promise((resolve) => {
      modal.confirm({
        title,
        content,
        centered: true,
        okText: CONFIRM_OK,
        cancelText: CONFIRM_CANCEL,
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  function clearResearchTimer() {
    if (researchTimerRef.current) {
      clearTimeout(researchTimerRef.current);
      researchTimerRef.current = null;
    }
  }

  function clearStructureTimer() {
    if (structureTimerRef.current) {
      clearTimeout(structureTimerRef.current);
      structureTimerRef.current = null;
    }
  }

  function clearChapterBeatsTimer() {
    if (chapterBeatsTimerRef.current) {
      clearTimeout(chapterBeatsTimerRef.current);
      chapterBeatsTimerRef.current = null;
    }
  }

  function clearWritingTimer() {
    if (writingTimerRef.current) {
      clearTimeout(writingTimerRef.current);
      writingTimerRef.current = null;
    }
    if (writingStreamRef.current) {
      clearInterval(writingStreamRef.current);
      writingStreamRef.current = null;
    }
  }

  function clearWritingState() {
    clearWritingTimer();
    setWriting(undefined);
    setSelectedUnitIds([]);
    setFocusUnitId(undefined);
  }

  /** 开始调研：已有选题时先确认，再短延迟写入 mock 选题卡。 */
  async function handleResearch() {
    try {
      await panelForm.validateFields(['idea']);
    } catch {
      return;
    }

    const idea = String(panelForm.getFieldValue('idea') ?? '').trim();
    if (!idea) {
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

    clearResearchTimer();
    clearStructureTimer();
    clearChapterBeatsTimer();
    clearWritingState();
    setPhase('researching');
    setSelectedTopicId(undefined);
    setTopics([]);
    setStructure(undefined);
    setGeneratingChapterId(undefined);

    researchTimerRef.current = setTimeout(() => {
      researchTimerRef.current = null;
      setTopics(MOCK_TOPICS);
      setPhase('researched');
    }, MOCK_RESEARCH_DELAY_MS);
  }

  /** 点选选题卡。 */
  function handleSelectTopic(id: string) {
    setSelectedTopicId(id);
  }

  /** 生成故事结构：已有结构时先确认；覆盖后清空写作。 */
  async function handleGenerateStructure() {
    if (!selectedTopicId) {
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

    const volumeRaw = panelForm.getFieldValue('volume');
    const volume: NovelVolume = isNovelVolume(volumeRaw) ? volumeRaw : 'short';

    clearStructureTimer();
    clearChapterBeatsTimer();
    clearWritingState();
    setPhase('structuring');
    setStructure(undefined);
    setGeneratingChapterId(undefined);

    structureTimerRef.current = setTimeout(() => {
      structureTimerRef.current = null;
      setStructure(getMockStructure(volume));
      setPhase('structured');
    }, MOCK_STRUCTURE_DELAY_MS);
  }

  /** 为指定章生成/覆盖章内节拍。 */
  async function handleGenerateChapterBeats(chapterId: string) {
    if (!structure || structure.kind !== 'chapters') return;
    const chapter = structure.chapters.find((item) => item.id === chapterId);
    if (!chapter) return;

    if (chapter.beats.length > 0) {
      const confirmed = await confirmOverwrite(
        CHAPTER_BEATS_REGENERATE_CONFIRM_TITLE,
        CHAPTER_BEATS_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    clearChapterBeatsTimer();
    setGeneratingChapterId(chapterId);

    chapterBeatsTimerRef.current = setTimeout(() => {
      chapterBeatsTimerRef.current = null;
      const beats = getMockChapterBeats({
        chapterId: chapter.id,
        title: chapter.title,
        purpose: chapter.purpose,
      });
      setStructure((prev) => {
        if (!prev || prev.kind !== 'chapters') return prev;
        return {
          ...prev,
          chapters: prev.chapters.map((item) =>
            item.id === chapterId ? { ...item, beats } : item,
          ),
        };
      });
      setWriting((prevWriting) => {
        if (!structure || structure.kind !== 'chapters') return prevWriting;
        const nextStructure: StructureSnapshot = {
          ...structure,
          chapters: structure.chapters.map((item) =>
            item.id === chapterId ? { ...item, beats } : item,
          ),
        };
        return syncWritingUnits(nextStructure, prevWriting);
      });
      setGeneratingChapterId(undefined);
    }, MOCK_CHAPTER_BEATS_DELAY_MS);
  }

  /** 上一步：写作 → 结构；结构 → 调研。 */
  function handlePrev() {
    if (phase === 'write' || phase === 'writing' || phase === 'written') {
      clearWritingTimer();
      setPhase('structured');
      return;
    }
    if (phase === 'structure' || phase === 'structuring' || phase === 'structured') {
      clearStructureTimer();
      clearChapterBeatsTimer();
      setGeneratingChapterId(undefined);
      setPhase('researched');
    }
  }

  /** 下一步：调研→结构；结构→写作；写作步提示预览未开放。 */
  function handleNext() {
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
      const nextWriting = syncWritingUnits(structure, writing);
      const defaults = defaultSelectedUnitIds(structure);
      setWriting(nextWriting);
      setSelectedUnitIds(defaults);
      setFocusUnitId(defaults[0]);
      setPhase(hasWritingBody(nextWriting) ? 'written' : 'write');
      return;
    }

    if (phase === 'write' || phase === 'writing' || phase === 'written') {
      message.info(PREVIEW_STEP_COMING);
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

  /** 对指定单元生成正文（仅节拍）；已有正文时先确认；mock 流式写入卡片。 */
  async function handleGenerateWriting(unitIds: string[]) {
    if (!structure || !writing) return;

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

    clearWritingTimer();
    const targets = new Map<string, string>();
    for (const unitId of generateIds) {
      const resolved = resolveWritingUnit(structure, unitId);
      if (!resolved) continue;
      const body =
        resolved.kind === 'chapter'
          ? getMockWritingBody({
              kind: 'chapter',
              chapterTitle: resolved.chapterTitle ?? '',
              chapterPurpose: resolved.chapterPurpose ?? '',
              beatTexts: resolved.beatTexts,
            })
          : getMockWritingBody({
              kind: 'beat',
              beatText: resolved.beatText ?? '',
              chapterTitle: resolved.chapterTitle,
              chapterPurpose: resolved.chapterPurpose,
            });
      targets.set(unitId, body);
    }

    setWriting((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        units: prev.units.map((unit) => (targets.has(unit.unitId) ? { ...unit, body: '' } : unit)),
      };
    });
    setPhase('writing');
    setFocusUnitId(generateIds[0] ?? focusUnitId);

    let step = 0;
    writingStreamRef.current = setInterval(() => {
      step += 1;
      const ratio = Math.min(1, step / MOCK_WRITING_STREAM_STEPS);
      setWriting((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          units: prev.units.map((unit) => {
            const full = targets.get(unit.unitId);
            if (full === undefined) return unit;
            const len = Math.ceil(full.length * ratio);
            return { ...unit, body: full.slice(0, len) };
          }),
        };
      });
      if (step >= MOCK_WRITING_STREAM_STEPS) {
        clearWritingTimer();
        setPhase('written');
      }
    }, MOCK_WRITING_STREAM_STEP_MS);
  }

  /** 更新指定单元正文。 */
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

  /** 更新短篇梗概。 */
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
    setWriting((prevWriting) => (prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting));
    setSelectedUnitIds((ids) => ids.filter((id) => id !== beatId));
    setFocusUnitId((current) => (current === beatId ? undefined : current));
  }

  /** 更新章纲标题或目的。 */
  function updateChapter(chapterId: string, patch: { title?: string; purpose?: string }) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'chapters') return prev;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, ...patch } : chapter,
        ),
      };
    });
  }

  /** 更新章内某条节拍。 */
  function updateChapterBeat(chapterId: string, beatId: string, text: string) {
    setStructure((prev) => {
      if (!prev || prev.kind !== 'chapters') return prev;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId
            ? {
                ...chapter,
                beats: chapter.beats.map((beat) => (beat.id === beatId ? { ...beat, text } : beat)),
              }
            : chapter,
        ),
      };
    });
  }

  /** 删除章内节拍。 */
  function removeChapterBeat(chapterId: string, beatId: string) {
    if (!structure || structure.kind !== 'chapters') return;
    const next: StructureSnapshot = {
      ...structure,
      chapters: structure.chapters.map((chapter) =>
        chapter.id === chapterId
          ? { ...chapter, beats: chapter.beats.filter((beat) => beat.id !== beatId) }
          : chapter,
      ),
    };
    setStructure(next);
    setWriting((prevWriting) => (prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting));
    setSelectedUnitIds((ids) => ids.filter((id) => id !== beatId));
    setFocusUnitId((current) => (current === beatId ? undefined : current));
  }

  /** 删除章纲条目；至少保留一章。 */
  function removeChapter(chapterId: string) {
    if (!structure || structure.kind !== 'chapters' || structure.chapters.length <= 1) {
      return;
    }
    const removed = structure.chapters.find((chapter) => chapter.id === chapterId);
    const removedIds = new Set([chapterId, ...(removed?.beats.map((beat) => beat.id) ?? [])]);
    const next: StructureSnapshot = {
      ...structure,
      chapters: structure.chapters.filter((chapter) => chapter.id !== chapterId),
    };
    setStructure(next);
    setWriting((prevWriting) => (prevWriting ? syncWritingUnits(next, prevWriting) : prevWriting));
    setSelectedUnitIds((ids) => ids.filter((id) => !removedIds.has(id)));
    setFocusUnitId((current) => (current && removedIds.has(current) ? undefined : current));
  }

  return {
    panelForm,
    panelInitialValues: DEFAULT_PANEL_VALUES,
    phase,
    topics,
    selectedTopicId,
    selectedTopic,
    structure,
    writing,
    selectedUnitIds,
    focusUnitId,
    generatingChapterId,
    handleResearch,
    handleSelectTopic,
    handleGenerateStructure,
    handleGenerateChapterBeats,
    handleGenerateWriting,
    handlePrev,
    handleNext,
    toggleWritingUnit,
    updateWritingBody,
    updateSynopsis,
    updateBeat,
    removeBeat,
    updateChapter,
    updateChapterBeat,
    removeChapterBeat,
    removeChapter,
  };
}
