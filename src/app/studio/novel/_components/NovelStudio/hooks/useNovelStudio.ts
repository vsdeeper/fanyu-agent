'use client';

import { App, Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  NOVEL_DEFAULT_REASONING_EFFORT,
  type NovelReasoningEffort,
} from '@/app/api/studio/novel/_shared/constants';
import type { NovelIdeaFile } from '@/app/api/studio/novel/_shared/types';
import type { NovelTaskDetail } from '@/app/api/studio/novel/_shared/task-types';
import { withChatSettingsBody } from '@/app/studio/_utils/chat-settings';
import { validateForm } from '@/app/studio/_utils/form-validate';
import type { StyleDimensionSelections } from '@/app/studio/_components/StyleDimensionPicker';
import { revokeLocalUploadItemUrls } from '@/lib/client/upload-items';
import {
  CAST_FAILED,
  CAST_NO_CAST,
  CAST_REGENERATE_CONFIRM_CONTENT,
  CAST_REGENERATE_CONFIRM_TITLE,
  CONFIRM_CANCEL,
  CONFIRM_OK,
  COPY_BODY_FAILED,
  COPY_BODY_OK,
  DEFAULT_PANEL_VALUES,
  IDEA_FILE_READ_FAILED,
  MISSING_CAST_WARNING,
  MISSING_CHAPTERS_WARNING,
  MISSING_IDEA_WARNING,
  MISSING_NARRATION_WARNING,
  MISSING_PLAN_WARNING,
  MISSING_PREVIEW_BODY_WARNING,
  MISSING_TOPIC_WARNING,
  MISSING_WRITE_SELECTION_WARNING,
  PLAN_FAILED,
  PLAN_FILE_READ_FAILED,
  PLAN_NO_PAYLOAD,
  PLAN_REGENERATE_CONFIRM_CONTENT,
  PLAN_REGENERATE_CONFIRM_TITLE,
  POLISH_FAILED,
  RESEARCH_FAILED,
  RESEARCH_NO_TOPICS,
  RESEARCH_REGENERATE_CONFIRM_CONTENT,
  RESEARCH_REGENERATE_CONFIRM_TITLE,
  VOLUME_CHAPTERS_FAILED,
  WRITE_REGENERATE_CONFIRM_CONTENT,
  WRITE_REGENERATE_CONFIRM_TITLE,
  WRITE_SEQUENCE_WARNING,
  WRITING_FAILED,
} from '../constants';
import type {
  CastStepSnapshot,
  ChaptersSnapshot,
  NovelPanelValues,
  NovelPlan,
  PlanStepSnapshot,
  ResearchStepSnapshot,
  StructureChapter,
  StudioPhase,
  TopicCard,
  WritingSnapshot,
  WriteStepSnapshot,
} from '../types';
import {
  areVolumesReadyForWrite,
  assertOkOrJsonFail,
  buildPreviewDocument,
  canGenerateWritingUnit,
  consumeAnalyzeSse,
  copyText,
  createRafTextBuffer,
  deleteNovelStep,
  extractTrailingJsonBlock,
  hasCastDraft,
  hasNarration,
  hasWritingBody,
  isAbortError,
  isCastReady,
  isFreshPlanComplete,
  isPlanReady,
  isSameWriteSnapshot,
  isSelectedVolumeReadyForWrite,
  parseCastPayload,
  parsePlanPayload,
  parseResearchTopics,
  parseVolumeChaptersPayload,
  readCastStepSnapshot,
  readChaptersStepSnapshot,
  readFormIdeaFiles,
  readPlanStepSnapshot,
  readResearchStepSnapshot,
  readWriteStepSnapshot,
  resolveGenerateUnitIds,
  resolveInitialPhase,
  resolveWritingUnit,
  saveNovelStep,
  serializeIdeaFiles,
  stripTrailingJsonFenceForDisplay,
  syncWritingUnits,
  toCastRequest,
  toNovelIdeaFileInput,
  toggleWritingSelection,
  writingChapterIds,
  writingStylePrompt,
} from '../utils';

/** 管理小说六步：调研 → 方案 → 角色 → 卷章 → 写作 → 预览。生成走 SSE，步骤落盘。 */
export function useNovelStudio(task: NovelTaskDetail) {
  const { message, modal } = App.useApp();
  const initialResearch = readResearchStepSnapshot(task.steps.research?.data);
  const initialPlan = readPlanStepSnapshot(task.steps.plan?.data);
  const initialCast = readCastStepSnapshot(task.steps.cast?.data);
  const initialChapters = readChaptersStepSnapshot(task.steps.chapters?.data);
  const storedInitialWrite = readWriteStepSnapshot(task.steps.write?.data);
  const initialWrite = syncWritingUnits(initialPlan, initialChapters, storedInitialWrite);

  const [reasoningEffort, setReasoningEffort] = useState<NovelReasoningEffort>(
    () => initialResearch?.reasoningEffort ?? NOVEL_DEFAULT_REASONING_EFFORT,
  );
  const reasoningEffortRef = useRef(reasoningEffort);
  const researchStreamTextRef = useRef(initialResearch?.streamText);
  const planStreamTextRef = useRef(initialPlan?.streamText);
  const [panelForm] = Form.useForm<NovelPanelValues>();
  const [panelInitialValues] = useState<NovelPanelValues>(() => ({
    idea: initialResearch?.idea ?? DEFAULT_PANEL_VALUES.idea,
    ideaFiles: initialResearch?.ideaFiles ?? DEFAULT_PANEL_VALUES.ideaFiles,
    planFiles: initialResearch?.planFiles ?? DEFAULT_PANEL_VALUES.planFiles,
    genres: initialResearch?.genres ?? DEFAULT_PANEL_VALUES.genres,
  }));
  const [phase, setPhase] = useState<StudioPhase>(() =>
    resolveInitialPhase({
      research: initialResearch,
      plan: initialPlan,
      cast: initialCast,
      chapters: initialChapters,
      writing: initialWrite,
    }),
  );
  const [topics, setTopics] = useState<TopicCard[]>(initialResearch?.topics ?? []);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(
    initialResearch?.selectedTopicId,
  );
  const [plan, setPlan] = useState<PlanStepSnapshot | undefined>(initialPlan);
  const [cast, setCast] = useState<CastStepSnapshot | undefined>(initialCast);
  const [chapters, setChapters] = useState<ChaptersSnapshot | undefined>(initialChapters);
  const [selectedVolumeId, setSelectedVolumeId] = useState<string | undefined>(
    initialChapters?.selectedVolumeId,
  );
  const [writing, setWriting] = useState<WritingSnapshot | undefined>(initialWrite);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(
    () => initialWrite?.selectedUnitIds ?? [],
  );
  const [focusUnitId, setFocusUnitId] = useState<string | undefined>(
    () => initialWrite?.focusUnitId,
  );
  const [generatingVolumeId, setGeneratingVolumeId] = useState<string | undefined>();
  const [generatingUnitIds, setGeneratingUnitIds] = useState<string[]>([]);
  const [polishingUnitId, setPolishingUnitId] = useState<string | undefined>();

  const abortRef = useRef<AbortController | null>(null);
  const polishingUnitIdRef = useRef<string | undefined>(undefined);
  const generatingRef = useRef(false);
  const streamRunIdRef = useRef(0);
  const phaseRef = useRef(phase);
  const planRef = useRef(plan);
  const castRef = useRef(cast);
  const chaptersRef = useRef(chapters);
  const writingRef = useRef(writing);
  const persistedWriteRef = useRef<WritingSnapshot | undefined>(storedInitialWrite);
  const topicsRef = useRef(topics);
  const selectedTopicIdRef = useRef(selectedTopicId);
  const selectedVolumeIdRef = useRef(selectedVolumeId);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    castRef.current = cast;
  }, [cast]);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);
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
    selectedVolumeIdRef.current = selectedVolumeId;
  }, [selectedVolumeId]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      const ideaFiles = panelForm.getFieldValue('ideaFiles');
      const planFiles = panelForm.getFieldValue('planFiles');
      if (Array.isArray(ideaFiles)) revokeLocalUploadItemUrls(ideaFiles);
      if (Array.isArray(planFiles)) revokeLocalUploadItemUrls(planFiles);
    };
  }, [panelForm]);

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
    const values = panelForm.getFieldsValue(true);
    const idea =
      typeof values.idea === 'string' ? values.idea.trim() : (initialResearch?.idea ?? '');
    const ideaFiles = readFormIdeaFiles(values.ideaFiles) ?? initialResearch?.ideaFiles ?? [];
    const planFiles = readFormIdeaFiles(values.planFiles) ?? initialResearch?.planFiles ?? [];
    const genres = Array.isArray(values.genres)
      ? values.genres.map((item: unknown) => String(item).trim()).filter(Boolean)
      : (initialResearch?.genres ?? []);
    return { idea, ideaFiles, planFiles, genres };
  }

  /** 体系设定必填。想法可选，创作方案文件另读。 */
  async function readIdeaPayload(
    panel: NovelPanelValues,
  ): Promise<{ idea?: string; ideaFiles: NovelIdeaFile[] } | 'missing' | 'unreadable'> {
    try {
      const ideaFiles = await toNovelIdeaFileInput(panel.ideaFiles);
      const idea = panel.idea.trim();
      if (ideaFiles.length === 0) return 'missing';
      return {
        ...(idea ? { idea } : {}),
        ideaFiles,
      };
    } catch (err) {
      console.error('[novel-studio] read idea file', err);
      return 'unreadable';
    }
  }

  async function readPlanFile(
    panel: NovelPanelValues,
  ): Promise<NovelIdeaFile | undefined | 'unreadable'> {
    if (panel.planFiles.length === 0) return undefined;
    try {
      const files = await toNovelIdeaFileInput(panel.planFiles.slice(0, 1));
      return files[0];
    } catch (err) {
      console.error('[novel-studio] read plan file', err);
      return 'unreadable';
    }
  }

  async function storedFiles(items: NovelPanelValues['ideaFiles'], failedMessage: string) {
    try {
      return await serializeIdeaFiles(items);
    } catch (err) {
      console.error('[novel-studio] serialize upload', err);
      message.error(failedMessage);
      return [];
    }
  }

  async function persistResearch(
    next: ResearchStepSnapshot,
  ): Promise<ResearchStepSnapshot | undefined> {
    if (next.streamText) researchStreamTextRef.current = next.streamText;
    try {
      return await saveNovelStep(task.id, 'research', next);
    } catch (err) {
      console.error('[novel-studio] persist research', err);
      return undefined;
    }
  }

  async function researchSnapshot(
    nextTopics: TopicCard[],
    extra?: Pick<ResearchStepSnapshot, 'selectedTopicId' | 'streamText'>,
  ): Promise<ResearchStepSnapshot> {
    const panel = readPanelValues();
    const ideaFiles = await storedFiles(panel.ideaFiles, IDEA_FILE_READ_FAILED);
    const planFiles = await storedFiles(panel.planFiles, PLAN_FILE_READ_FAILED);
    const nextSelected = extra?.selectedTopicId ?? selectedTopicIdRef.current;
    const streamText = extra?.streamText ?? researchStreamTextRef.current;
    return {
      idea: panel.idea,
      ...(ideaFiles.length ? { ideaFiles } : {}),
      ...(planFiles.length ? { planFiles } : {}),
      genres: panel.genres,
      topics: nextTopics,
      reasoningEffort: reasoningEffortRef.current,
      ...(nextSelected ? { selectedTopicId: nextSelected } : {}),
      ...(streamText ? { streamText } : {}),
    };
  }

  async function handleReasoningEffortChange(next: NovelReasoningEffort) {
    if (next === reasoningEffortRef.current) return;
    reasoningEffortRef.current = next;
    setReasoningEffort(next);
    await persistResearch(await researchSnapshot(topicsRef.current));
  }

  async function persistPlan(next: PlanStepSnapshot): Promise<PlanStepSnapshot | undefined> {
    if (next.streamText) planStreamTextRef.current = next.streamText;
    try {
      return await saveNovelStep(task.id, 'plan', next);
    } catch (err) {
      console.error('[novel-studio] persist plan', err);
      return undefined;
    }
  }

  async function persistCast(next: CastStepSnapshot): Promise<CastStepSnapshot | undefined> {
    try {
      return await saveNovelStep(task.id, 'cast', next);
    } catch (err) {
      console.error('[novel-studio] persist cast', err);
      return undefined;
    }
  }

  async function persistChapters(next: ChaptersSnapshot): Promise<ChaptersSnapshot | undefined> {
    try {
      return await saveNovelStep(task.id, 'chapters', next);
    } catch (err) {
      console.error('[novel-studio] persist chapters', err);
      return undefined;
    }
  }

  async function persistWrite(next: WriteStepSnapshot): Promise<WriteStepSnapshot | undefined> {
    if (isSameWriteSnapshot(persistedWriteRef.current, next)) return persistedWriteRef.current;
    try {
      const saved = await saveNovelStep(task.id, 'write', next);
      persistedWriteRef.current = saved;
      return saved;
    } catch (err) {
      console.error('[novel-studio] persist write', err);
      return undefined;
    }
  }

  function withUnitBody(base: WritingSnapshot, unitId: string, body: string): WritingSnapshot {
    return {
      ...base,
      units: base.units.map((unit) => (unit.unitId === unitId ? { ...unit, body } : unit)),
    };
  }

  function commitWriting(next: WritingSnapshot) {
    writingRef.current = next;
    setWriting(next);
  }

  function withSelection(
    base: WritingSnapshot,
    nextIds: string[],
    nextFocus: string | undefined,
  ): WritingSnapshot {
    const nextWriting: WritingSnapshot = { ...base };
    if (nextIds.length) nextWriting.selectedUnitIds = nextIds;
    else delete nextWriting.selectedUnitIds;
    if (nextFocus) nextWriting.focusUnitId = nextFocus;
    else delete nextWriting.focusUnitId;
    return nextWriting;
  }

  /** 重新生成方案或角色时清掉更后面的落盘。 */
  async function clearDownstreamSteps(from: 'plan' | 'cast') {
    try {
      if (from === 'plan') await deleteNovelStep(task.id, 'cast');
      await deleteNovelStep(task.id, 'chapters');
      await deleteNovelStep(task.id, 'write');
      persistedWriteRef.current = undefined;
    } catch (err) {
      console.error('[novel-studio] clear downstream steps', err);
    }
  }

  function resetDownstreamMemory(from: 'plan' | 'cast') {
    if (from === 'plan') {
      planRef.current = undefined;
      setPlan(undefined);
      castRef.current = undefined;
      setCast(undefined);
    }
    chaptersRef.current = undefined;
    setChapters(undefined);
    selectedVolumeIdRef.current = undefined;
    setSelectedVolumeId(undefined);
    setWriting(undefined);
    writingRef.current = undefined;
    setSelectedUnitIds([]);
    setFocusUnitId(undefined);
    setGeneratingVolumeId(undefined);
    generatingRef.current = false;
    setGeneratingUnitIds([]);
  }

  /**
   * 跑一轮 SSE。runId 与 streamRunIdRef 不一致时直接跳过。
   */
  async function runSse(
    url: string,
    body: Record<string, unknown>,
    buffer: ReturnType<typeof createRafTextBuffer>,
    failedMessage: string,
    onDone: (fullText: string) => Promise<void> | void,
    busyPhase: StudioPhase,
    idlePhase: StudioPhase,
    runId: number,
  ) {
    if (runId !== streamRunIdRef.current) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase(busyPhase);
    buffer.reset();
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(
          withChatSettingsBody({ ...body, reasoningEffort: reasoningEffortRef.current }),
        ),
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
      if (controller.signal.aborted || runId !== streamRunIdRef.current) return;
      if (receivedDone) {
        await onDone(buffer.getText());
        return;
      }
      if (runId !== streamRunIdRef.current) return;
      setPhase(idlePhase);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted || runId !== streamRunIdRef.current)
        return;
      console.error('[novel-studio]', url, err);
      message.error(err instanceof Error && err.message ? err.message : failedMessage);
      setPhase(idlePhase);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function handleResearch() {
    if (!(await validateForm(panelForm))) return;
    const panel = readPanelValues();
    const ideaPayload = await readIdeaPayload(panel);
    if (ideaPayload === 'missing') {
      message.warning(MISSING_IDEA_WARNING);
      return;
    }
    if (ideaPayload === 'unreadable') {
      message.error(IDEA_FILE_READ_FAILED);
      return;
    }
    const planFile = await readPlanFile(panel);
    if (planFile === 'unreadable') {
      message.error(PLAN_FILE_READ_FAILED);
      return;
    }

    if (topics.length > 0) {
      const confirmed = await confirmOverwrite(
        RESEARCH_REGENERATE_CONFIRM_TITLE,
        RESEARCH_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const runId = ++streamRunIdRef.current;
    abortRef.current?.abort();
    setSelectedTopicId(undefined);
    setTopics([]);
    setPhase('researching');

    const researchBuffer = createRafTextBuffer(() => {
      /* 选题过程文案不单独展示 */
    });

    await runSse(
      '/api/studio/novel/research',
      {
        ...ideaPayload,
        ...(planFile ? { planFile } : {}),
        ...(panel.genres.length ? { genres: panel.genres } : {}),
      },
      researchBuffer,
      RESEARCH_FAILED,
      async (fullText) => {
        if (runId !== streamRunIdRef.current) return;
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const nextTopics = parseResearchTopics(json);
        if (nextTopics.length === 0) {
          if (runId !== streamRunIdRef.current) return;
          setTopics([]);
          setSelectedTopicId(undefined);
          setPhase('research');
          message.error(RESEARCH_NO_TOPICS);
          return;
        }
        if (runId !== streamRunIdRef.current) return;
        setTopics(nextTopics);
        setSelectedTopicId(undefined);
        selectedTopicIdRef.current = undefined;
        setPhase('researched');
        await persistResearch(
          await researchSnapshot(nextTopics, {
            streamText: stripTrailingJsonFenceForDisplay(prose || fullText),
          }),
        );
      },
      'researching',
      'research',
      runId,
    );
  }

  /** 点选一卷。还没有章卡时先记在内存，生成后写入卷章快照。 */
  function handleSelectVolume(volumeId: string) {
    const currentPlan = planRef.current;
    if (!currentPlan?.volumes.some((volume) => volume.id === volumeId)) return;
    if (selectedVolumeIdRef.current === volumeId) return;
    selectedVolumeIdRef.current = volumeId;
    setSelectedVolumeId(volumeId);
    const current = chaptersRef.current;
    if (!current || !current.volumes.some((volume) => volume.id === volumeId)) return;
    const next: ChaptersSnapshot = { ...current, selectedVolumeId: volumeId };
    chaptersRef.current = next;
    setChapters(next);
    void persistChapters(next);
  }

  async function handleSelectTopic(id: string) {
    setSelectedTopicId(id);
    selectedTopicIdRef.current = id;
    const currentTopics = topicsRef.current;
    if (currentTopics.length === 0) return;
    await persistResearch(await researchSnapshot(currentTopics, { selectedTopicId: id }));
  }

  function updateTopic(next: TopicCard) {
    const updated = topicsRef.current.map((topic) => (topic.id === next.id ? next : topic));
    topicsRef.current = updated;
    setTopics(updated);
    void researchSnapshot(updated).then((snapshot) => persistResearch(snapshot));
  }

  async function handleGeneratePlan() {
    if (!selectedTopicId || !selectedTopic) {
      message.warning(MISSING_TOPIC_WARNING);
      return;
    }
    const panel = readPanelValues();
    const ideaPayload = await readIdeaPayload(panel);
    if (ideaPayload === 'missing') {
      message.warning(MISSING_IDEA_WARNING);
      return;
    }
    if (ideaPayload === 'unreadable') {
      message.error(IDEA_FILE_READ_FAILED);
      return;
    }
    const planFile = await readPlanFile(panel);
    if (planFile === 'unreadable') {
      message.error(PLAN_FILE_READ_FAILED);
      return;
    }

    if (plan || hasCastDraft(cast) || chapters || hasWritingBody(writing)) {
      const confirmed = await confirmOverwrite(
        PLAN_REGENERATE_CONFIRM_TITLE,
        PLAN_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const hadDraft = Boolean(planRef.current);
    const runId = ++streamRunIdRef.current;
    resetDownstreamMemory('plan');
    setPhase('planning');
    await clearDownstreamSteps('plan');
    if (runId !== streamRunIdRef.current) return;

    const buffer = createRafTextBuffer(() => {
      /* 方案过程文案不单独展示 */
    });
    await runSse(
      '/api/studio/novel/plan',
      {
        ...ideaPayload,
        ...(planFile ? { planFile } : {}),
        ...(panel.genres.length ? { genres: panel.genres } : {}),
        topic: selectedTopic,
      },
      buffer,
      PLAN_FAILED,
      async (fullText) => {
        if (runId !== streamRunIdRef.current) return;
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const parsed = parsePlanPayload(json);
        if (!parsed || !isFreshPlanComplete(parsed)) {
          if (runId !== streamRunIdRef.current) return;
          setPhase(hadDraft ? 'planned' : 'plan');
          message.error(PLAN_NO_PAYLOAD);
          return;
        }
        if (runId !== streamRunIdRef.current) return;
        const next: PlanStepSnapshot = {
          ...parsed,
          streamText: stripTrailingJsonFenceForDisplay(prose || fullText),
        };
        planRef.current = next;
        setPlan(next);
        setPhase('planned');
        await persistPlan(next);
      },
      'planning',
      hadDraft ? 'planned' : 'plan',
      runId,
    );
  }

  function updatePlan(next: NovelPlan) {
    const streamText = planStreamTextRef.current;
    const snapshot: PlanStepSnapshot = { ...next, ...(streamText ? { streamText } : {}) };
    planRef.current = snapshot;
    setPlan(snapshot);
    const pruned = pruneChapters(snapshot, chaptersRef.current);
    if (pruned !== chaptersRef.current) {
      chaptersRef.current = pruned;
      setChapters(pruned);
      if (pruned) void persistChapters(pruned);
      else void deleteNovelStep(task.id, 'chapters');
    }
    const nextSelected =
      pruned?.selectedVolumeId ??
      (selectedVolumeIdRef.current &&
      snapshot.volumes.some((volume) => volume.id === selectedVolumeIdRef.current)
        ? selectedVolumeIdRef.current
        : undefined);
    if (nextSelected !== selectedVolumeIdRef.current) {
      selectedVolumeIdRef.current = nextSelected;
      setSelectedVolumeId(nextSelected);
    }
    const nextWriting = syncWritingUnits(snapshot, pruned, writingRef.current);
    commitWriting(nextWriting);
    setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
    setFocusUnitId(nextWriting.focusUnitId);
    void persistPlan(snapshot);
    void persistWrite(nextWriting);
  }

  async function importPlan(next: PlanStepSnapshot): Promise<boolean> {
    const saved = await persistPlan(next);
    if (!saved) return false;
    planRef.current = next;
    setPlan(next);
    return true;
  }

  async function handleGenerateCast() {
    const currentPlan = planRef.current;
    if (!selectedTopic) {
      message.warning(MISSING_TOPIC_WARNING);
      return;
    }
    if (!isPlanReady(currentPlan) || !currentPlan) {
      message.warning(MISSING_PLAN_WARNING);
      return;
    }
    const panel = readPanelValues();
    const ideaPayload = await readIdeaPayload(panel);
    if (ideaPayload === 'missing') {
      message.warning(MISSING_IDEA_WARNING);
      return;
    }
    if (ideaPayload === 'unreadable') {
      message.error(IDEA_FILE_READ_FAILED);
      return;
    }
    const planFile = await readPlanFile(panel);
    if (planFile === 'unreadable') {
      message.error(PLAN_FILE_READ_FAILED);
      return;
    }

    if (
      hasCastDraft(castRef.current) ||
      chaptersRef.current ||
      hasWritingBody(writingRef.current)
    ) {
      const confirmed = await confirmOverwrite(
        CAST_REGENERATE_CONFIRM_TITLE,
        CAST_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const hadDraft = hasCastDraft(castRef.current);
    const runId = ++streamRunIdRef.current;
    resetDownstreamMemory('cast');
    setPhase('casting');
    await clearDownstreamSteps('cast');
    if (runId !== streamRunIdRef.current) return;

    const buffer = createRafTextBuffer(() => {
      /* 角色过程文案不单独展示 */
    });
    await runSse(
      '/api/studio/novel/bible',
      {
        ...ideaPayload,
        ...(planFile ? { planFile } : {}),
        ...(panel.genres.length ? { genres: panel.genres } : {}),
        topic: selectedTopic,
        plan: planRequestBody(currentPlan),
      },
      buffer,
      CAST_FAILED,
      async (fullText) => {
        if (runId !== streamRunIdRef.current) return;
        const { json } = extractTrailingJsonBlock(fullText);
        const parsed = parseCastPayload(json);
        if (!parsed) {
          if (runId !== streamRunIdRef.current) return;
          setPhase(hadDraft ? 'casted' : 'cast');
          message.error(CAST_NO_CAST);
          return;
        }
        if (runId !== streamRunIdRef.current) return;
        castRef.current = parsed;
        setCast(parsed);
        setPhase('casted');
        await persistCast(parsed);
      },
      'casting',
      hadDraft ? 'casted' : 'cast',
      runId,
    );
  }

  function updateCast(next: CastStepSnapshot) {
    castRef.current = next;
    setCast(next);
    void persistCast(next);
  }

  async function importCast(next: CastStepSnapshot): Promise<boolean> {
    const saved = await persistCast(next);
    if (!saved) return false;
    castRef.current = saved;
    setCast(saved);
    return true;
  }

  async function importChapters(next: ChaptersSnapshot): Promise<boolean> {
    const selected = selectedVolumeIdRef.current;
    const stamped: ChaptersSnapshot =
      selected && next.volumes.some((volume) => volume.id === selected)
        ? { ...next, selectedVolumeId: selected }
        : next;
    const saved = await persistChapters(stamped);
    if (!saved) return false;
    chaptersRef.current = stamped;
    setChapters(stamped);
    if (!stamped.selectedVolumeId && selectedVolumeIdRef.current) {
      selectedVolumeIdRef.current = undefined;
      setSelectedVolumeId(undefined);
    }
    return true;
  }

  /** 为一卷生成章卡。返回 ok 表示这一卷已写入；stop 表示中止或失败，调用方不要继续下一卷。 */
  async function handleGenerateVolumeChapters(volumeId: string): Promise<'ok' | 'stop'> {
    const currentPlan = planRef.current;
    if (!currentPlan || !selectedTopic) return 'stop';
    const castBody = toCastRequest(castRef.current);
    if (!castBody) {
      message.warning(MISSING_CAST_WARNING);
      return 'stop';
    }
    const volume = currentPlan.volumes.find((item) => item.id === volumeId);
    if (!volume) return 'stop';
    const panel = readPanelValues();
    const ideaPayload = await readIdeaPayload(panel);
    if (ideaPayload === 'missing') {
      message.warning(MISSING_IDEA_WARNING);
      return 'stop';
    }
    if (ideaPayload === 'unreadable') {
      message.error(IDEA_FILE_READ_FAILED);
      return 'stop';
    }
    const planFile = await readPlanFile(panel);
    if (planFile === 'unreadable') {
      message.error(PLAN_FILE_READ_FAILED);
      return 'stop';
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setGeneratingVolumeId(volumeId);
    setPhase('chaptering');
    const buffer = createRafTextBuffer(() => {
      /* 章卡过程文案不单独展示 */
    });

    try {
      const res = await fetch('/api/studio/novel/volume-chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(
          withChatSettingsBody({
            reasoningEffort: reasoningEffortRef.current,
            topic: selectedTopic,
            plan: planRequestBody(currentPlan),
            cast: castBody,
            ...ideaPayload,
            ...(planFile ? { planFile } : {}),
            volume,
            siblingVolumes: currentPlan.volumes.filter((item) => item.id !== volumeId),
          }),
        ),
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
      if (controller.signal.aborted) return 'stop';
      if (!receivedDone) return 'stop';

      const { json } = extractTrailingJsonBlock(buffer.getText());
      const nextCards = parseVolumeChaptersPayload(json);
      if (nextCards.length === 0) {
        message.error(VOLUME_CHAPTERS_FAILED);
        return 'stop';
      }
      const nextChapters = replaceVolumeChapters(
        currentPlan,
        chaptersRef.current,
        volumeId,
        nextCards,
        selectedVolumeIdRef.current,
      );
      chaptersRef.current = nextChapters;
      setChapters(nextChapters);
      const nextWriting = syncWritingUnits(currentPlan, nextChapters, writingRef.current);
      commitWriting(nextWriting);
      setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
      setFocusUnitId(nextWriting.focusUnitId);
      await persistChapters(nextChapters);
      await persistWrite(nextWriting);
      return 'ok';
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return 'stop';
      console.error('[novel-studio] volume-chapters', err);
      message.error(err instanceof Error && err.message ? err.message : VOLUME_CHAPTERS_FAILED);
      return 'stop';
    } finally {
      setGeneratingVolumeId(undefined);
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase(areVolumesReadyForWrite(chaptersRef.current) ? 'chaptered' : 'chapters');
      }
    }
  }

  function updateChapter(
    chapterId: string,
    patch: Partial<Pick<StructureChapter, 'title' | 'scene' | 'event' | 'hook'>>,
  ) {
    const current = chaptersRef.current;
    if (!current) return;
    const next: ChaptersSnapshot = {
      ...current,
      volumes: current.volumes.map((volume) => ({
        ...volume,
        chapters: volume.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, ...patch } : chapter,
        ),
      })),
    };
    chaptersRef.current = next;
    setChapters(next);
    void persistChapters(next);
  }

  function removeChapter(chapterId: string) {
    const current = chaptersRef.current;
    const currentPlan = planRef.current;
    if (!current) return;
    const volumes = current.volumes
      .map((volume) => ({
        ...volume,
        chapters: volume.chapters.filter((chapter) => chapter.id !== chapterId),
      }))
      .filter((volume) => volume.chapters.length > 0);
    const keptSelection =
      current.selectedVolumeId && volumes.some((volume) => volume.id === current.selectedVolumeId)
        ? current.selectedVolumeId
        : undefined;
    const next = volumes.length
      ? { volumes, ...(keptSelection ? { selectedVolumeId: keptSelection } : {}) }
      : undefined;
    if (keptSelection !== selectedVolumeIdRef.current) {
      selectedVolumeIdRef.current = keptSelection;
      setSelectedVolumeId(keptSelection);
    }
    chaptersRef.current = next;
    setChapters(next);
    const nextWriting = syncWritingUnits(currentPlan, next, writingRef.current);
    commitWriting(nextWriting);
    setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
    setFocusUnitId(nextWriting.focusUnitId);
    if (next) void persistChapters(next);
    else void deleteNovelStep(task.id, 'chapters');
    void persistWrite(nextWriting);
  }

  function handlePrev() {
    const current = phaseRef.current;
    if (
      current === 'planning' ||
      current === 'casting' ||
      current === 'chaptering' ||
      current === 'researching' ||
      polishingUnitIdRef.current ||
      generatingRef.current
    ) {
      return;
    }
    if (current === 'preview') {
      setPhase(hasWritingBody(writingRef.current) ? 'written' : 'write');
      return;
    }
    if (current === 'write' || current === 'writing' || current === 'written') {
      abortRef.current?.abort();
      setPhase(areVolumesReadyForWrite(chaptersRef.current) ? 'chaptered' : 'chapters');
      return;
    }
    if (current === 'chapters' || current === 'chaptered') {
      abortRef.current?.abort();
      setGeneratingVolumeId(undefined);
      setPhase(hasCastDraft(castRef.current) ? 'casted' : 'cast');
      return;
    }
    if (current === 'cast' || current === 'casted') {
      abortRef.current?.abort();
      const currentCast = castRef.current;
      if (currentCast) void persistCast(currentCast);
      setPhase(planRef.current ? 'planned' : 'plan');
      return;
    }
    if (current === 'plan' || current === 'planned') {
      abortRef.current?.abort();
      const currentPlan = planRef.current;
      if (currentPlan) void persistPlan(currentPlan);
      setPhase('researched');
    }
  }

  async function handleNext() {
    if (polishingUnitIdRef.current || generatingRef.current) return;
    if (phase === 'researched') {
      if (!selectedTopicId) return;
      setPhase(plan ? 'planned' : 'plan');
      return;
    }
    if (phase === 'plan' || phase === 'planned') {
      if (!isPlanReady(plan)) {
        message.warning(MISSING_PLAN_WARNING);
        return;
      }
      if (plan) await persistPlan(plan);
      setPhase(hasCastDraft(cast) ? 'casted' : 'cast');
      return;
    }
    if (phase === 'cast' || phase === 'casted') {
      if (!isCastReady(cast)) {
        message.warning(MISSING_CAST_WARNING);
        return;
      }
      if (cast) await persistCast(cast);
      setPhase(areVolumesReadyForWrite(chapters) ? 'chaptered' : 'chapters');
      return;
    }
    if (phase === 'chapters' || phase === 'chaptering') {
      message.warning(MISSING_CHAPTERS_WARNING);
      return;
    }
    if (phase === 'chaptered') {
      const volumeId = selectedVolumeIdRef.current ?? chapters?.selectedVolumeId;
      const ready = chapters && volumeId ? { ...chapters, selectedVolumeId: volumeId } : chapters;
      if (!isSelectedVolumeReadyForWrite(plan, ready) || !plan || !ready) {
        message.warning(MISSING_CHAPTERS_WARNING);
        return;
      }
      chaptersRef.current = ready;
      setChapters(ready);
      await persistChapters(ready);
      const synced = syncWritingUnits(plan, ready, writingRef.current ?? writing);
      const visible = new Set(writingChapterIds(plan, ready));
      const nextIds = (synced.selectedUnitIds ?? []).filter((id) => visible.has(id));
      const nextFocus =
        synced.focusUnitId && nextIds.includes(synced.focusUnitId) ? synced.focusUnitId : undefined;
      const nextWriting = withSelection(synced, nextIds, nextFocus);
      commitWriting(nextWriting);
      setSelectedUnitIds(nextIds);
      setFocusUnitId(nextFocus);
      setPhase(hasWritingBody(nextWriting) ? 'written' : 'write');
      await persistWrite(nextWriting);
      return;
    }
    if (phase === 'write' || phase === 'writing' || phase === 'written') {
      const currentWriting = writingRef.current ?? writing;
      if (!hasWritingBody(currentWriting)) {
        message.warning(MISSING_PREVIEW_BODY_WARNING);
        return;
      }
      abortRef.current?.abort();
      if (currentWriting) await persistWrite(currentWriting);
      setPhase('preview');
    }
  }

  async function handleCopyPreview() {
    if (!plan || !writing) return;
    const { plainText } = buildPreviewDocument(plan, chapters, writing);
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

  async function handleCopyWritingBody(unitId: string) {
    const body = (writingRef.current ?? writing)?.units.find(
      (unit) => unit.unitId === unitId,
    )?.body;
    if (!body?.trim()) return;
    try {
      await copyText(body);
      message.success(COPY_BODY_OK);
    } catch {
      message.error(COPY_BODY_FAILED);
    }
  }

  function toggleWritingUnit(unitId: string) {
    const valid = writingChapterIds(planRef.current, chaptersRef.current);
    const next = toggleWritingSelection(valid, selectedUnitIds, unitId);
    const nextFocus = next.includes(unitId) ? unitId : next.at(-1);
    setSelectedUnitIds(next);
    setFocusUnitId(nextFocus);
    const base = writingRef.current;
    if (!base) return;
    commitWriting(withSelection(base, next, nextFocus));
  }

  function updateTense(tense: WritingSnapshot['tense']) {
    const prev = writingRef.current;
    if (!prev || !tense) return;
    const nextWriting: WritingSnapshot = { ...prev, tense };
    commitWriting(nextWriting);
    void persistWrite(nextWriting);
  }

  async function handleGenerateWriting(unitIds: string[]) {
    const currentPlan = planRef.current;
    const currentChapters = chaptersRef.current;
    const currentWriting = writingRef.current;
    if (!currentPlan || !currentWriting || !selectedTopic) return;
    const castBody = toCastRequest(castRef.current);
    if (!castBody) {
      message.warning(MISSING_CAST_WARNING);
      return;
    }
    if (!hasNarration(currentWriting)) {
      message.warning(MISSING_NARRATION_WARNING);
      return;
    }

    const valid = writingChapterIds(currentPlan, currentChapters);
    const unitId = resolveGenerateUnitIds(valid, unitIds)[0];
    if (!unitId) {
      message.warning(MISSING_WRITE_SELECTION_WARNING);
      return;
    }
    const resolved = resolveWritingUnit(currentPlan, currentChapters, unitId);
    if (!resolved) {
      message.warning(MISSING_WRITE_SELECTION_WARNING);
      return;
    }
    if (!canGenerateWritingUnit(currentPlan, currentChapters, currentWriting, unitId)) {
      message.warning(WRITE_SEQUENCE_WARNING);
      return;
    }

    const previousBody = currentWriting.units.find((unit) => unit.unitId === unitId)?.body ?? '';
    if (previousBody.trim()) {
      const confirmed = await confirmOverwrite(
        WRITE_REGENERATE_CONFIRM_TITLE,
        WRITE_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const stylePrompt = writingStylePrompt(currentWriting);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    generatingRef.current = true;
    commitWriting(withUnitBody(currentWriting, unitId, ''));
    setGeneratingUnitIds([unitId]);
    setPhase('writing');
    setFocusUnitId(unitId);

    const buffer = createRafTextBuffer((text) => {
      const base = writingRef.current ?? currentWriting;
      commitWriting(withUnitBody(base, unitId, text));
    });
    const bodyById = new Map(currentWriting.units.map((unit) => [unit.unitId, unit.body]));

    try {
      const res = await fetch('/api/studio/novel/writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(
          withChatSettingsBody({
            reasoningEffort: reasoningEffortRef.current,
            unitId,
            topic: selectedTopic,
            plan: planRequestBody(currentPlan),
            cast: castBody,
            tense: currentWriting.tense,
            ...(stylePrompt ? { stylePrompt } : {}),
            previousChapters: resolved.previous.map((chapter) => {
              const body = bodyById.get(chapter.id)?.trim();
              return {
                title: chapter.title,
                scene: chapter.scene,
                event: chapter.event,
                hook: chapter.hook,
                ...(body ? { body } : {}),
              };
            }),
            chapter: {
              title: resolved.chapter.title,
              scene: resolved.chapter.scene,
              event: resolved.chapter.event,
              hook: resolved.chapter.hook,
            },
            ...(resolved.next
              ? { nextChapter: { title: resolved.next.title, hook: resolved.next.hook } }
              : {}),
          }),
        ),
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
      const generated = buffer.getText();
      if (!receivedDone || !generated.trim()) {
        commitWriting(withUnitBody(writingRef.current ?? currentWriting, unitId, previousBody));
        setPhase(hasWritingBody(writingRef.current) ? 'written' : 'write');
        return;
      }
      const nextWriting = withUnitBody(writingRef.current ?? currentWriting, unitId, generated);
      commitWriting(nextWriting);
      setPhase('written');
      await persistWrite(nextWriting);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[novel-studio] writing', err);
      commitWriting(withUnitBody(writingRef.current ?? currentWriting, unitId, previousBody));
      message.error(err instanceof Error && err.message ? err.message : WRITING_FAILED);
      setPhase(hasWritingBody(writingRef.current) ? 'written' : 'write');
    } finally {
      buffer.dispose();
      if (abortRef.current === controller) {
        abortRef.current = null;
        generatingRef.current = false;
        setGeneratingUnitIds([]);
      }
    }
  }

  async function handlePolishWriting(unitId: string) {
    const currentWriting = writingRef.current;
    const currentPlan = planRef.current;
    const currentChapters = chaptersRef.current;
    if (!currentWriting || !currentPlan) return;
    const previousBody = currentWriting.units.find((unit) => unit.unitId === unitId)?.body ?? '';
    if (!previousBody.trim()) return;
    const resolved = resolveWritingUnit(currentPlan, currentChapters, unitId);
    if (!resolved) return;

    const stylePrompt = writingStylePrompt(currentWriting);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    polishingUnitIdRef.current = unitId;
    setPolishingUnitId(unitId);
    setPhase('writing');
    setFocusUnitId(unitId);

    const buffer = createRafTextBuffer((text) => {
      const base = writingRef.current ?? currentWriting;
      commitWriting(withUnitBody(base, unitId, text));
    });

    try {
      const res = await fetch('/api/studio/novel/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify(
          withChatSettingsBody({
            reasoningEffort: reasoningEffortRef.current,
            body: previousBody.trim(),
            label: resolved.label,
            scene: resolved.chapter.scene,
            event: resolved.chapter.event,
            hook: resolved.chapter.hook,
            ...(stylePrompt ? { stylePrompt } : {}),
          }),
        ),
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
      const polished = buffer.getText().trim();
      if (!receivedDone || !polished) {
        commitWriting(withUnitBody(writingRef.current ?? currentWriting, unitId, previousBody));
        if (receivedDone) message.warning(POLISH_FAILED);
        setPhase('written');
        return;
      }
      const nextWriting = withUnitBody(writingRef.current ?? currentWriting, unitId, polished);
      commitWriting(nextWriting);
      setPhase('written');
      await persistWrite(nextWriting);
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[novel-studio] polish', err);
      commitWriting(withUnitBody(writingRef.current ?? currentWriting, unitId, previousBody));
      message.error(err instanceof Error && err.message ? err.message : POLISH_FAILED);
      setPhase('written');
    } finally {
      buffer.dispose();
      if (abortRef.current === controller) {
        abortRef.current = null;
        polishingUnitIdRef.current = undefined;
        setPolishingUnitId(undefined);
      }
    }
  }

  function updateWritingBody(unitId: string, body: string) {
    setFocusUnitId(unitId);
    const prev = writingRef.current;
    if (!prev) return;
    const nextWriting = withUnitBody(prev, unitId, body);
    if ((prev.selectedUnitIds ?? []).includes(unitId)) nextWriting.focusUnitId = unitId;
    commitWriting(nextWriting);
    void persistWrite(nextWriting);
  }

  function updateStyleSelections(next: StyleDimensionSelections) {
    const prev = writingRef.current;
    if (!prev) return;
    const nextWriting: WritingSnapshot = { ...prev };
    if (Object.keys(next).length) nextWriting.styleSelections = next;
    else delete nextWriting.styleSelections;
    commitWriting(nextWriting);
    void persistWrite(nextWriting);
  }

  return {
    panelForm,
    panelInitialValues,
    reasoningEffort,
    phase,
    topics,
    selectedTopicId,
    selectedTopic,
    plan,
    cast,
    chapters,
    selectedVolumeId,
    writing,
    selectedUnitIds,
    focusUnitId,
    generatingVolumeId,
    generatingUnitIds,
    polishingUnitId,
    handleReasoningEffortChange,
    handleResearch,
    handleSelectTopic,
    updateTopic,
    handleGeneratePlan,
    updatePlan,
    importPlan,
    handleGenerateCast,
    updateCast,
    importCast,
    importChapters,
    handleGenerateVolumeChapters,
    handleSelectVolume,
    updateChapter,
    removeChapter,
    handleGenerateWriting,
    handlePolishWriting,
    handlePrev,
    handleNext,
    handleCopyPreview,
    handleCopyWritingBody,
    toggleWritingUnit,
    updateWritingBody,
    updateStyleSelections,
    updateTense,
  };
}

/** 请求体只带方案三块，不带流式过程文案。 */
function planRequestBody(plan: NovelPlan): NovelPlan {
  return {
    worldview: plan.worldview,
    threads: plan.threads,
    ending: plan.ending,
    theme: plan.theme,
    volumes: plan.volumes,
  };
}

/** 去掉已经不在创作方案里的卷，以及被清空的卷。 */
function pruneChapters(
  plan: NovelPlan,
  chapters: ChaptersSnapshot | undefined,
): ChaptersSnapshot | undefined {
  if (!chapters) return undefined;
  const ids = new Set(plan.volumes.map((volume) => volume.id));
  const volumes = chapters.volumes.filter(
    (volume) => ids.has(volume.id) && volume.chapters.length > 0,
  );
  if (volumes.length === 0) return undefined;
  const selectedVolumeId =
    chapters.selectedVolumeId && volumes.some((volume) => volume.id === chapters.selectedVolumeId)
      ? chapters.selectedVolumeId
      : undefined;
  if (
    volumes.length === chapters.volumes.length &&
    volumes.every((volume, index) => volume === chapters.volumes[index]) &&
    selectedVolumeId === chapters.selectedVolumeId
  ) {
    return chapters;
  }
  return selectedVolumeId ? { volumes, selectedVolumeId } : { volumes };
}

/** 用新章卡覆盖指定卷，其它卷保持原样。 */
function replaceVolumeChapters(
  plan: NovelPlan,
  chapters: ChaptersSnapshot | undefined,
  volumeId: string,
  nextCards: StructureChapter[],
  selectedVolumeId?: string,
): ChaptersSnapshot {
  const byId = new Map((chapters?.volumes ?? []).map((volume) => [volume.id, volume.chapters]));
  byId.set(volumeId, nextCards);
  const volumes = plan.volumes
    .filter((volume) => (byId.get(volume.id)?.length ?? 0) > 0)
    .map((volume) => ({ id: volume.id, chapters: byId.get(volume.id) ?? [] }));
  const chosen = [selectedVolumeId, chapters?.selectedVolumeId].find(
    (id): id is string => Boolean(id) && volumes.some((volume) => volume.id === id),
  );
  return chosen ? { volumes, selectedVolumeId: chosen } : { volumes };
}
