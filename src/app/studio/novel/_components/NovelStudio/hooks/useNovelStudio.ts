'use client';

import { App, Form } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  NOVEL_DEFAULT_REASONING_EFFORT,
  type NovelReasoningEffort,
} from '@/app/api/studio/novel/_shared/constants';
import type {
  NovelIdeaFile,
  NovelSection,
  NovelVolumeDesign,
} from '@/app/api/studio/novel/_shared/types';
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
  MISSING_CAST_WARNING,
  MISSING_CHAPTERS_WARNING,
  MISSING_NARRATION_WARNING,
  MISSING_PLAN_WARNING,
  MISSING_TOPIC_WARNING,
  MISSING_VOLUME_SELECTION_WARNING,
  MISSING_WORLDVIEW_WARNING,
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
  VOLUMES_FAILED,
  VOLUMES_NO_VOLUMES,
  VOLUMES_REGENERATE_CONFIRM_CONTENT,
  VOLUMES_REGENERATE_CONFIRM_TITLE,
  VOLUME_CHAPTERS_FAILED,
  WORLDVIEW_FAILED,
  WORLDVIEW_FILE_READ_FAILED,
  WORLDVIEW_NO_SECTIONS,
  WORLDVIEW_REGENERATE_CONFIRM_CONTENT,
  WORLDVIEW_REGENERATE_CONFIRM_TITLE,
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
  VolumesStepSnapshot,
  WorldviewStepSnapshot,
  WritingSnapshot,
  WriteStepSnapshot,
} from '../types';
import {
  assertOkOrJsonFail,
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
  isSectionsReady,
  isSelectedVolumeReady,
  isSelectedVolumeReadyForChapters,
  parseCastPayload,
  parsePlanPayload,
  parseResearchTopics,
  parseSectionsPayload,
  parseVolumeChaptersPayload,
  parseVolumesPayload,
  readCastStepSnapshot,
  readChaptersStepSnapshot,
  readFormIdeaFiles,
  readPlanStepSnapshot,
  readResearchStepSnapshot,
  readVolumesStepSnapshot,
  readWorldviewStepSnapshot,
  readWriteStepSnapshot,
  resolveGenerateUnitIds,
  resolveInitialPhase,
  resolveWorldviewSections,
  resolveWritingUnit,
  saveNovelStep,
  selectedVolume,
  serializeIdeaFiles,
  stripTrailingJsonFenceForDisplay,
  syncWritingUnits,
  toCastRequest,
  toNovelIdeaFileInput,
  toPlanRequest,
  toggleWritingSelection,
  writingChapterIds,
  writingStylePrompt,
} from '../utils';

/** 管理小说七步：世界观 → 调研 → 方案 → 角色 → 卷纲 → 卷章 → 写作。生成走 SSE，步骤落盘。 */
export function useNovelStudio(task: NovelTaskDetail) {
  const { message, modal } = App.useApp();
  const initialWorldview = readWorldviewStepSnapshot(task.steps.worldview?.data);
  const initialResearch = readResearchStepSnapshot(task.steps.research?.data);
  const initialPlan = readPlanStepSnapshot(task.steps.plan?.data);
  const initialCast = readCastStepSnapshot(task.steps.cast?.data);
  const initialVolumes = readVolumesStepSnapshot(task.steps.volumes?.data);
  const initialChapters = readChaptersStepSnapshot(task.steps.chapters?.data);
  const storedInitialWrite = readWriteStepSnapshot(task.steps.write?.data);
  const initialWrite = syncWritingUnits(initialChapters, storedInitialWrite);

  // 思考强度是任务级设置，落盘世界观步骤；旧任务没有这一步时读旧的选题快照
  const [reasoningEffort, setReasoningEffort] = useState<NovelReasoningEffort>(
    () =>
      initialWorldview?.reasoningEffort ??
      initialResearch?.reasoningEffort ??
      NOVEL_DEFAULT_REASONING_EFFORT,
  );
  const reasoningEffortRef = useRef(reasoningEffort);
  const researchSavedRef = useRef(Boolean(initialResearch));
  const worldviewStreamTextRef = useRef(initialWorldview?.streamText);
  const researchStreamTextRef = useRef(initialResearch?.streamText);
  const planStreamTextRef = useRef(initialPlan?.streamText);
  const volumesStreamTextRef = useRef(initialVolumes?.streamText);
  const [panelForm] = Form.useForm<NovelPanelValues>();
  const [panelInitialValues] = useState<NovelPanelValues>(() => ({
    worldviewFiles:
      initialWorldview?.files ??
      initialResearch?.worldviewFiles ??
      DEFAULT_PANEL_VALUES.worldviewFiles,
    planFiles: initialResearch?.planFiles ?? DEFAULT_PANEL_VALUES.planFiles,
    genres: initialResearch?.genres ?? DEFAULT_PANEL_VALUES.genres,
  }));
  const [phase, setPhase] = useState<StudioPhase>(() =>
    resolveInitialPhase({
      worldview: initialWorldview,
      research: initialResearch,
      plan: initialPlan,
      cast: initialCast,
      volumes: initialVolumes,
      chapters: initialChapters,
      writing: initialWrite,
    }),
  );
  const [worldview, setWorldview] = useState<WorldviewStepSnapshot | undefined>(initialWorldview);
  const [topics, setTopics] = useState<TopicCard[]>(initialResearch?.topics ?? []);
  const [selectedTopicId, setSelectedTopicId] = useState<string | undefined>(
    initialResearch?.selectedTopicId,
  );
  const [plan, setPlan] = useState<PlanStepSnapshot | undefined>(initialPlan);
  const [cast, setCast] = useState<CastStepSnapshot | undefined>(initialCast);
  const [volumes, setVolumes] = useState<VolumesStepSnapshot | undefined>(initialVolumes);
  const [chapters, setChapters] = useState<ChaptersSnapshot | undefined>(initialChapters);
  const [writing, setWriting] = useState<WritingSnapshot | undefined>(initialWrite);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>(
    () => initialWrite?.selectedUnitIds ?? [],
  );
  const [focusUnitId, setFocusUnitId] = useState<string | undefined>(
    () => initialWrite?.focusUnitId,
  );
  const [generatingUnitIds, setGeneratingUnitIds] = useState<string[]>([]);
  const [polishingUnitId, setPolishingUnitId] = useState<string | undefined>();

  const abortRef = useRef<AbortController | null>(null);
  const polishingUnitIdRef = useRef<string | undefined>(undefined);
  const generatingRef = useRef(false);
  const streamRunIdRef = useRef(0);
  const phaseRef = useRef(phase);
  const worldviewRef = useRef(worldview);
  const planRef = useRef(plan);
  const castRef = useRef(cast);
  const volumesRef = useRef(volumes);
  const chaptersRef = useRef(chapters);
  const writingRef = useRef(writing);
  const persistedWriteRef = useRef<WritingSnapshot | undefined>(storedInitialWrite);
  const topicsRef = useRef(topics);
  const selectedTopicIdRef = useRef(selectedTopicId);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    worldviewRef.current = worldview;
  }, [worldview]);
  useEffect(() => {
    planRef.current = plan;
  }, [plan]);
  useEffect(() => {
    castRef.current = cast;
  }, [cast]);
  useEffect(() => {
    volumesRef.current = volumes;
  }, [volumes]);
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
    return () => {
      abortRef.current?.abort();
      const worldviewFiles = panelForm.getFieldValue('worldviewFiles');
      const planFiles = panelForm.getFieldValue('planFiles');
      if (Array.isArray(worldviewFiles)) revokeLocalUploadItemUrls(worldviewFiles);
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
    const worldviewFiles =
      readFormIdeaFiles(values.worldviewFiles) ??
      initialWorldview?.files ??
      initialResearch?.worldviewFiles ??
      [];
    const planFiles = readFormIdeaFiles(values.planFiles) ?? initialResearch?.planFiles ?? [];
    const genres = Array.isArray(values.genres)
      ? values.genres.map((item: unknown) => String(item).trim()).filter(Boolean)
      : (initialResearch?.genres ?? []);
    return { worldviewFiles, planFiles, genres };
  }

  /** 世界观设定附件必填。 */
  async function readWorldviewPayload(
    panel: NovelPanelValues,
  ): Promise<NovelIdeaFile[] | 'missing' | 'unreadable'> {
    try {
      const ideaFiles = await toNovelIdeaFileInput(panel.worldviewFiles);
      if (ideaFiles.length === 0) return 'missing';
      return ideaFiles;
    } catch (err) {
      console.error('[novel-studio] read worldview file', err);
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

  /** 当前可用的世界观章节：世界观步骤的结果，旧任务退回旧方案里的世界观。 */
  function currentWorldviewSections(): NovelSection[] {
    return resolveWorldviewSections(worldviewRef.current, planRef.current);
  }

  async function storedFiles(items: NovelPanelValues['worldviewFiles'], failedMessage: string) {
    try {
      return await serializeIdeaFiles(items);
    } catch (err) {
      console.error('[novel-studio] serialize upload', err);
      message.error(failedMessage);
      return [];
    }
  }

  async function persistWorldview(
    next: WorldviewStepSnapshot,
  ): Promise<WorldviewStepSnapshot | undefined> {
    if (next.streamText) worldviewStreamTextRef.current = next.streamText;
    try {
      return await saveNovelStep(task.id, 'worldview', next);
    } catch (err) {
      console.error('[novel-studio] persist worldview', err);
      return undefined;
    }
  }

  async function worldviewSnapshot(
    sections: NovelSection[],
    extra?: Pick<WorldviewStepSnapshot, 'streamText'>,
  ): Promise<WorldviewStepSnapshot> {
    const panel = readPanelValues();
    const files = await storedFiles(panel.worldviewFiles, WORLDVIEW_FILE_READ_FAILED);
    const streamText = extra?.streamText ?? worldviewStreamTextRef.current;
    return {
      sections,
      ...(files.length ? { files } : {}),
      ...(streamText ? { streamText } : {}),
      reasoningEffort: reasoningEffortRef.current,
    };
  }

  async function persistResearch(
    next: ResearchStepSnapshot,
  ): Promise<ResearchStepSnapshot | undefined> {
    if (next.streamText) researchStreamTextRef.current = next.streamText;
    try {
      const saved = await saveNovelStep(task.id, 'research', next);
      researchSavedRef.current = true;
      return saved;
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
    const planFiles = await storedFiles(panel.planFiles, PLAN_FILE_READ_FAILED);
    const nextSelected = extra?.selectedTopicId ?? selectedTopicIdRef.current;
    const streamText = extra?.streamText ?? researchStreamTextRef.current;
    return {
      ...(planFiles.length ? { planFiles } : {}),
      genres: panel.genres,
      topics: nextTopics,
      reasoningEffort: reasoningEffortRef.current,
      ...(nextSelected ? { selectedTopicId: nextSelected } : {}),
      ...(streamText ? { streamText } : {}),
    };
  }

  /**
   * 思考强度对每一步生效，选在世界观步骤。
   * 只在已有快照上落盘：改一个设置不该凭空写出步骤行。还没有世界观步骤时，值会随这一轮生成的快照一起写入。
   */
  async function handleReasoningEffortChange(next: NovelReasoningEffort) {
    if (next === reasoningEffortRef.current) return;
    reasoningEffortRef.current = next;
    setReasoningEffort(next);
    if (worldviewRef.current) {
      await persistWorldview(await worldviewSnapshot(worldviewRef.current.sections));
      return;
    }
    if (researchSavedRef.current) {
      await persistResearch(await researchSnapshot(topicsRef.current));
    }
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

  async function persistVolumes(
    next: VolumesStepSnapshot,
  ): Promise<VolumesStepSnapshot | undefined> {
    if (next.streamText) volumesStreamTextRef.current = next.streamText;
    try {
      return await saveNovelStep(task.id, 'volumes', next);
    } catch (err) {
      console.error('[novel-studio] persist volumes', err);
      return undefined;
    }
  }

  function volumesSnapshot(
    nextVolumes: NovelVolumeDesign[],
    extra?: Pick<VolumesStepSnapshot, 'selectedVolumeId' | 'streamText'>,
  ): VolumesStepSnapshot {
    const nextSelected = extra?.selectedVolumeId ?? volumesRef.current?.selectedVolumeId;
    const streamText = extra?.streamText ?? volumesStreamTextRef.current;
    return {
      volumes: nextVolumes,
      ...(nextSelected && nextVolumes.some((volume) => volume.id === nextSelected)
        ? { selectedVolumeId: nextSelected }
        : {}),
      ...(streamText ? { streamText } : {}),
    };
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

  /** 重新生成某一步时清掉更后面的落盘。清卷章与正文之前先清卷纲。 */
  async function clearDownstreamSteps(from: 'worldview' | 'plan' | 'cast' | 'volumes') {
    try {
      if (from === 'worldview') {
        await deleteNovelStep(task.id, 'research');
        await deleteNovelStep(task.id, 'plan');
      }
      if (from === 'worldview' || from === 'plan') await deleteNovelStep(task.id, 'cast');
      if (from !== 'volumes') await deleteNovelStep(task.id, 'volumes');
      await deleteNovelStep(task.id, 'chapters');
      await deleteNovelStep(task.id, 'write');
      persistedWriteRef.current = undefined;
    } catch (err) {
      console.error('[novel-studio] clear downstream steps', err);
    }
  }

  function resetDownstreamMemory(from: 'worldview' | 'plan' | 'cast' | 'volumes') {
    if (from === 'worldview') {
      setTopics([]);
      topicsRef.current = [];
      setSelectedTopicId(undefined);
      selectedTopicIdRef.current = undefined;
    }
    if (from === 'worldview' || from === 'plan') {
      planRef.current = undefined;
      setPlan(undefined);
      castRef.current = undefined;
      setCast(undefined);
    }
    if (from === 'worldview' || from === 'plan' || from === 'cast') {
      volumesRef.current = undefined;
      setVolumes(undefined);
    }
    chaptersRef.current = undefined;
    setChapters(undefined);
    setWriting(undefined);
    writingRef.current = undefined;
    setSelectedUnitIds([]);
    setFocusUnitId(undefined);
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

  async function handleGenerateWorldview() {
    if (!(await validateForm(panelForm))) return;
    const panel = readPanelValues();
    const ideaFiles = await readWorldviewPayload(panel);
    if (ideaFiles === 'missing') {
      message.warning(MISSING_WORLDVIEW_WARNING);
      return;
    }
    if (ideaFiles === 'unreadable') {
      message.error(WORLDVIEW_FILE_READ_FAILED);
      return;
    }

    if (isSectionsReady(worldviewRef.current?.sections)) {
      const confirmed = await confirmOverwrite(
        WORLDVIEW_REGENERATE_CONFIRM_TITLE,
        WORLDVIEW_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const hadDraft = isSectionsReady(worldviewRef.current?.sections);
    const runId = ++streamRunIdRef.current;
    resetDownstreamMemory('worldview');
    setPhase('worldviewing');
    await clearDownstreamSteps('worldview');
    if (runId !== streamRunIdRef.current) return;

    const buffer = createRafTextBuffer(() => {
      /* 世界观过程文案不单独展示 */
    });
    await runSse(
      '/api/studio/novel/worldview',
      { ideaFiles },
      buffer,
      WORLDVIEW_FAILED,
      async (fullText) => {
        if (runId !== streamRunIdRef.current) return;
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const sections = parseSectionsPayload(json);
        if (!isSectionsReady(sections)) {
          if (runId !== streamRunIdRef.current) return;
          setPhase(hadDraft ? 'worldviewed' : 'worldview');
          message.error(WORLDVIEW_NO_SECTIONS);
          return;
        }
        if (runId !== streamRunIdRef.current) return;
        const next: WorldviewStepSnapshot = {
          sections,
          streamText: stripTrailingJsonFenceForDisplay(prose || fullText),
        };
        const snapshot = await worldviewSnapshot(next.sections, { streamText: next.streamText });
        worldviewRef.current = snapshot;
        setWorldview(snapshot);
        setPhase('worldviewed');
        await persistWorldview(snapshot);
      },
      'worldviewing',
      hadDraft ? 'worldviewed' : 'worldview',
      runId,
    );
  }

  function updateWorldview(next: NovelSection[]) {
    const streamText = worldviewStreamTextRef.current;
    const snapshot: WorldviewStepSnapshot = {
      sections: next,
      ...(worldviewRef.current?.files ? { files: worldviewRef.current.files } : {}),
      ...(streamText ? { streamText } : {}),
      reasoningEffort: reasoningEffortRef.current,
    };
    worldviewRef.current = snapshot;
    setWorldview(snapshot);
    void persistWorldview(snapshot);
  }

  async function importWorldview(next: WorldviewStepSnapshot): Promise<boolean> {
    const snapshot: WorldviewStepSnapshot = {
      ...next,
      ...(next.files?.length ? {} : { files: worldviewRef.current?.files ?? [] }),
      reasoningEffort: next.reasoningEffort ?? reasoningEffortRef.current,
    };
    const saved = await persistWorldview(snapshot);
    if (!saved) return false;
    worldviewRef.current = saved;
    setWorldview(saved);
    return true;
  }

  async function handleResearch() {
    if (!(await validateForm(panelForm))) return;
    if (!isSectionsReady(currentWorldviewSections())) {
      message.warning(MISSING_WORLDVIEW_WARNING);
      return;
    }
    const panel = readPanelValues();
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
        worldview: currentWorldviewSections(),
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
    const planFile = await readPlanFile(panel);
    if (planFile === 'unreadable') {
      message.error(PLAN_FILE_READ_FAILED);
      return;
    }

    if (plan || hasCastDraft(cast) || volumes || chapters || hasWritingBody(writing)) {
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
        worldview: currentWorldviewSections(),
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
    void persistPlan(snapshot);
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

    if (
      hasCastDraft(castRef.current) ||
      volumesRef.current ||
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
        worldview: currentWorldviewSections(),
        topic: selectedTopic,
        plan: toPlanRequest(currentPlan),
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

  async function handleGenerateVolumes() {
    const currentPlan = planRef.current;
    const castBody = toCastRequest(castRef.current);
    if (!selectedTopic) {
      message.warning(MISSING_TOPIC_WARNING);
      return;
    }
    if (!castBody || !currentPlan) {
      message.warning(MISSING_CAST_WARNING);
      return;
    }

    if (volumesRef.current || chaptersRef.current || hasWritingBody(writingRef.current)) {
      const confirmed = await confirmOverwrite(
        VOLUMES_REGENERATE_CONFIRM_TITLE,
        VOLUMES_REGENERATE_CONFIRM_CONTENT,
      );
      if (!confirmed) return;
    }

    const hadDraft = Boolean(volumesRef.current);
    const runId = ++streamRunIdRef.current;
    resetDownstreamMemory('volumes');
    setPhase('voluming');
    await clearDownstreamSteps('volumes');
    if (runId !== streamRunIdRef.current) return;

    const buffer = createRafTextBuffer(() => {
      /* 卷纲过程文案不单独展示 */
    });
    await runSse(
      '/api/studio/novel/volumes',
      {
        worldview: currentWorldviewSections(),
        topic: selectedTopic,
        plan: toPlanRequest(currentPlan),
        cast: castBody,
      },
      buffer,
      VOLUMES_FAILED,
      async (fullText) => {
        if (runId !== streamRunIdRef.current) return;
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const nextVolumes = parseVolumesPayload(json, currentPlan);
        if (nextVolumes.length === 0) {
          if (runId !== streamRunIdRef.current) return;
          setPhase(hadDraft ? 'volumed' : 'volumes');
          message.error(VOLUMES_NO_VOLUMES);
          return;
        }
        if (runId !== streamRunIdRef.current) return;
        // 新排的卷纲不沿用旧的选中卷：卷 id 是模型新给的，选中态要重新点
        const nextStreamText = stripTrailingJsonFenceForDisplay(prose || fullText);
        const snapshot: VolumesStepSnapshot = {
          volumes: nextVolumes,
          ...(nextStreamText ? { streamText: nextStreamText } : {}),
        };
        volumesRef.current = snapshot;
        setVolumes(snapshot);
        setPhase('volumed');
        await persistVolumes(snapshot);
      },
      'voluming',
      hadDraft ? 'volumed' : 'volumes',
      runId,
    );
  }

  /** 编辑卷纲：章卡只保留 id 仍在卷纲里的卷，对不上的正文一并剪掉。 */
  function updateVolumes(next: NovelVolumeDesign[]) {
    const snapshot = volumesSnapshot(next);
    volumesRef.current = snapshot;
    setVolumes(snapshot);
    const pruned = pruneChapters(snapshot, chaptersRef.current);
    if (pruned !== chaptersRef.current) {
      chaptersRef.current = pruned;
      setChapters(pruned);
      if (pruned) void persistChapters(pruned);
      else void deleteNovelStep(task.id, 'chapters');
    }
    const nextWriting = syncWritingUnits(pruned, writingRef.current);
    commitWriting(nextWriting);
    setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
    setFocusUnitId(nextWriting.focusUnitId);
    void persistVolumes(snapshot);
    void persistWrite(nextWriting);
  }

  /** 点选一卷。卷章与写作都跟着切到这一卷，其它卷的章卡与正文留在快照里。 */
  function handleSelectVolume(volumeId: string) {
    const current = volumesRef.current;
    if (!current || !current.volumes.some((volume) => volume.id === volumeId)) return;
    if (current.selectedVolumeId === volumeId) return;
    const next: VolumesStepSnapshot = { ...current, selectedVolumeId: volumeId };
    volumesRef.current = next;
    setVolumes(next);
    void persistVolumes(next);
  }

  async function importVolumes(next: VolumesStepSnapshot): Promise<boolean> {
    const current = volumesRef.current;
    const selected =
      next.selectedVolumeId && next.volumes.some((volume) => volume.id === next.selectedVolumeId)
        ? next.selectedVolumeId
        : current?.selectedVolumeId &&
            next.volumes.some((volume) => volume.id === current.selectedVolumeId)
          ? current.selectedVolumeId
          : undefined;
    const snapshot: VolumesStepSnapshot = {
      volumes: next.volumes,
      ...(selected ? { selectedVolumeId: selected } : {}),
      ...(next.streamText ? { streamText: next.streamText } : {}),
    };
    const saved = await persistVolumes(snapshot);
    if (!saved) return false;
    volumesRef.current = saved;
    setVolumes(saved);
    const pruned = pruneChapters(saved, chaptersRef.current);
    if (pruned !== chaptersRef.current) {
      chaptersRef.current = pruned;
      setChapters(pruned);
      if (pruned) void persistChapters(pruned);
      else void deleteNovelStep(task.id, 'chapters');
    }
    const nextWriting = syncWritingUnits(pruned, writingRef.current);
    commitWriting(nextWriting);
    setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
    setFocusUnitId(nextWriting.focusUnitId);
    void persistWrite(nextWriting);
    return true;
  }

  async function importChapters(next: ChaptersSnapshot): Promise<boolean> {
    const saved = await persistChapters(next);
    if (!saved) return false;
    chaptersRef.current = next;
    setChapters(next);
    const nextWriting = syncWritingUnits(next, writingRef.current);
    commitWriting(nextWriting);
    setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
    setFocusUnitId(nextWriting.focusUnitId);
    void persistWrite(nextWriting);
    return true;
  }

  /** 为点选的那一卷生成章卡。返回 ok 表示已写入；stop 表示中止或失败。 */
  async function handleGenerateVolumeChapters(): Promise<'ok' | 'stop'> {
    const currentPlan = planRef.current;
    const volume = selectedVolume(volumesRef.current);
    if (!currentPlan || !selectedTopic) return 'stop';
    const castBody = toCastRequest(castRef.current);
    if (!castBody) {
      message.warning(MISSING_CAST_WARNING);
      return 'stop';
    }
    if (!volume) {
      message.warning(MISSING_VOLUME_SELECTION_WARNING);
      return 'stop';
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
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
            worldview: currentWorldviewSections(),
            topic: selectedTopic,
            plan: toPlanRequest(currentPlan),
            cast: castBody,
            volume,
            siblingVolumes: (volumesRef.current?.volumes ?? []).filter(
              (item) => item.id !== volume.id,
            ),
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
        volumesRef.current?.volumes ?? [],
        chaptersRef.current,
        volume.id,
        nextCards,
      );
      chaptersRef.current = nextChapters;
      setChapters(nextChapters);
      const nextWriting = syncWritingUnits(nextChapters, writingRef.current);
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
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase(
          isSelectedVolumeReady(volumesRef.current, chaptersRef.current) ? 'chaptered' : 'chapters',
        );
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
    if (!current) return;
    const volumesWithChapters = current.volumes
      .map((volume) => ({
        ...volume,
        chapters: volume.chapters.filter((chapter) => chapter.id !== chapterId),
      }))
      .filter((volume) => volume.chapters.length > 0);
    const next: ChaptersSnapshot | undefined = volumesWithChapters.length
      ? { volumes: volumesWithChapters }
      : undefined;
    chaptersRef.current = next;
    setChapters(next);
    const nextWriting = syncWritingUnits(next, writingRef.current);
    commitWriting(nextWriting);
    setSelectedUnitIds(nextWriting.selectedUnitIds ?? []);
    setFocusUnitId(nextWriting.focusUnitId);
    if (next) void persistChapters(next);
    else void deleteNovelStep(task.id, 'chapters');
    void persistWrite(nextWriting);
    if (!isSelectedVolumeReady(volumesRef.current, next)) {
      setPhase('chapters');
    }
  }

  function handlePrev() {
    const current = phaseRef.current;
    if (
      current === 'worldviewing' ||
      current === 'planning' ||
      current === 'casting' ||
      current === 'voluming' ||
      current === 'chaptering' ||
      current === 'researching' ||
      polishingUnitIdRef.current ||
      generatingRef.current
    ) {
      return;
    }
    if (current === 'write' || current === 'writing' || current === 'written') {
      abortRef.current?.abort();
      setPhase(
        isSelectedVolumeReady(volumesRef.current, chaptersRef.current) ? 'chaptered' : 'chapters',
      );
      return;
    }
    if (current === 'chapters' || current === 'chaptered') {
      abortRef.current?.abort();
      setPhase(volumesRef.current ? 'volumed' : 'volumes');
      return;
    }
    if (current === 'volumes' || current === 'volumed') {
      abortRef.current?.abort();
      const currentVolumes = volumesRef.current;
      if (currentVolumes) void persistVolumes(currentVolumes);
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
      return;
    }
    if (current === 'research' || current === 'researched') {
      abortRef.current?.abort();
      setPhase(isSectionsReady(worldviewRef.current?.sections) ? 'worldviewed' : 'worldview');
    }
  }

  async function handleNext() {
    if (polishingUnitIdRef.current || generatingRef.current) return;
    if (phase === 'worldview' || phase === 'worldviewed') {
      if (!isSectionsReady(worldviewRef.current?.sections)) {
        message.warning(MISSING_WORLDVIEW_WARNING);
        return;
      }
      if (worldview) await persistWorldview(worldview);
      setPhase(topics.length > 0 ? 'researched' : 'research');
      return;
    }
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
      setPhase(volumesRef.current ? 'volumed' : 'volumes');
      return;
    }
    if (phase === 'volumes' || phase === 'volumed') {
      if (!isSelectedVolumeReadyForChapters(volumesRef.current)) {
        message.warning(MISSING_VOLUME_SELECTION_WARNING);
        return;
      }
      if (volumes) await persistVolumes(volumes);
      setPhase(
        isSelectedVolumeReady(volumesRef.current, chaptersRef.current) ? 'chaptered' : 'chapters',
      );
      return;
    }
    if (phase === 'chapters' || phase === 'chaptering') {
      message.warning(MISSING_CHAPTERS_WARNING);
      return;
    }
    if (phase === 'chaptered') {
      const currentVolumes = volumesRef.current;
      if (!isSelectedVolumeReady(currentVolumes, chapters)) {
        message.warning(MISSING_CHAPTERS_WARNING);
        return;
      }
      const synced = syncWritingUnits(chapters, writingRef.current ?? writing);
      const visible = new Set(writingChapterIds(currentVolumes, chapters));
      const nextIds = (synced.selectedUnitIds ?? []).filter((id) => visible.has(id));
      const nextFocus =
        synced.focusUnitId && nextIds.includes(synced.focusUnitId) ? synced.focusUnitId : undefined;
      const nextWriting = withSelection(synced, nextIds, nextFocus);
      commitWriting(nextWriting);
      setSelectedUnitIds(nextIds);
      setFocusUnitId(nextFocus);
      setPhase(hasWritingBody(nextWriting) ? 'written' : 'write');
      await persistWrite(nextWriting);
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
    const valid = writingChapterIds(volumesRef.current, chaptersRef.current);
    const next = toggleWritingSelection(valid, selectedUnitIds, unitId);
    const nextFocus = next.includes(unitId) ? unitId : next.at(-1);
    setSelectedUnitIds(next);
    setFocusUnitId(nextFocus);
    const base = writingRef.current;
    if (!base) return;
    commitWriting(withSelection(base, next, nextFocus));
  }

  async function handleGenerateWriting(unitIds: string[]) {
    const currentPlan = planRef.current;
    const currentVolumes = volumesRef.current;
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

    const valid = writingChapterIds(currentVolumes, currentChapters);
    const unitId = resolveGenerateUnitIds(valid, unitIds)[0];
    if (!unitId) {
      message.warning(MISSING_WRITE_SELECTION_WARNING);
      return;
    }
    const resolved = resolveWritingUnit(currentVolumes, currentChapters, unitId);
    if (!resolved) {
      message.warning(MISSING_WRITE_SELECTION_WARNING);
      return;
    }
    if (!canGenerateWritingUnit(currentVolumes, currentChapters, currentWriting, unitId)) {
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
            worldview: currentWorldviewSections(),
            topic: selectedTopic,
            plan: toPlanRequest(currentPlan),
            cast: castBody,
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
    const currentChapters = chaptersRef.current;
    if (!currentWriting) return;
    const previousBody = currentWriting.units.find((unit) => unit.unitId === unitId)?.body ?? '';
    if (!previousBody.trim()) return;
    const resolved = resolveWritingUnit(volumesRef.current, currentChapters, unitId);
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
    worldview,
    topics,
    selectedTopicId,
    selectedTopic,
    plan,
    cast,
    volumes,
    chapters,
    writing,
    selectedUnitIds,
    focusUnitId,
    generatingUnitIds,
    polishingUnitId,
    handleReasoningEffortChange,
    handleGenerateWorldview,
    updateWorldview,
    importWorldview,
    handleResearch,
    handleSelectTopic,
    updateTopic,
    handleGeneratePlan,
    updatePlan,
    importPlan,
    handleGenerateCast,
    updateCast,
    importCast,
    handleGenerateVolumes,
    updateVolumes,
    importVolumes,
    handleSelectVolume,
    importChapters,
    handleGenerateVolumeChapters,
    updateChapter,
    removeChapter,
    handleGenerateWriting,
    handlePolishWriting,
    handlePrev,
    handleNext,
    handleCopyWritingBody,
    toggleWritingUnit,
    updateWritingBody,
    updateStyleSelections,
  };
}

/** 去掉已经不在卷纲里的卷，以及被清空的卷。 */
function pruneChapters(
  volumes: VolumesStepSnapshot,
  chapters: ChaptersSnapshot | undefined,
): ChaptersSnapshot | undefined {
  if (!chapters) return undefined;
  const ids = new Set(volumes.volumes.map((volume) => volume.id));
  const kept = chapters.volumes.filter(
    (volume) => ids.has(volume.id) && volume.chapters.length > 0,
  );
  if (kept.length === 0) return undefined;
  if (
    kept.length === chapters.volumes.length &&
    kept.every((volume, index) => volume === chapters.volumes[index])
  ) {
    return chapters;
  }
  return { volumes: kept };
}

/** 用新章卡覆盖指定卷，其它卷保持原样。 */
function replaceVolumeChapters(
  volumes: NovelVolumeDesign[],
  chapters: ChaptersSnapshot | undefined,
  volumeId: string,
  nextCards: StructureChapter[],
): ChaptersSnapshot {
  const byId = new Map((chapters?.volumes ?? []).map((volume) => [volume.id, volume.chapters]));
  byId.set(volumeId, nextCards);
  return {
    volumes: volumes
      .filter((volume) => (byId.get(volume.id)?.length ?? 0) > 0)
      .map((volume) => ({ id: volume.id, chapters: byId.get(volume.id) ?? [] })),
  };
}
