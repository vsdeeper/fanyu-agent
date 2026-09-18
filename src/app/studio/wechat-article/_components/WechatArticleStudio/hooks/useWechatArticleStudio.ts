import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { WechatArticleTaskDetail } from '@/app/api/studio/wechat-article/_shared/task-types';
import { getModelCapability } from '@/app/studio/_utils/model-options';
import {
  COPY_FAILED,
  COPY_IMAGE_FAILED,
  COPY_OK,
  DRAFT_FAILED,
  GENERATE_FAILED,
  MISSING_ANGLE_WARNING,
  MISSING_IDEA_WARNING,
  MISSING_PLAN_WARNING,
  MISSING_TITLE_WARNING,
  PLAN_FAILED,
  RESEARCH_FAILED,
} from '../constants';
import type {
  AngleCard,
  DraftStepSnapshot,
  ImageSlot,
  PlanStepSnapshot,
  ResearchStepSnapshot,
  StudioPhase,
} from '../types';
import {
  assertOkOrJsonFail,
  buildCopyArticleText,
  consumeAnalyzeSse,
  consumeGenerateNdjson,
  copyImageFromUrl,
  copyText,
  createRafTextBuffer,
  defaultImageSpec,
  cleanResearchBrief,
  extractTrailingJsonBlock,
  isAbortError,
  isSameDraftSnapshot,
  isSamePlanSnapshot,
  isSameResearchSnapshot,
  joinStyleSamples,
  parseDraftMeta,
  parsePlanPayload,
  parseResearchPayload,
  readDraftStepSnapshot,
  readPlanStepSnapshot,
  readResearchStepSnapshot,
  resolveInitialPhase,
  resolvePlanTitle,
  saveWechatStep,
  splitStyleSamples,
} from '../utils';

/** 管理公众号四步：调研 → 思路 → 成稿 → 完成；配图仅用户点击生成。 */
export function useWechatArticleStudio(task: WechatArticleTaskDetail) {
  const { message } = App.useApp();
  const initialResearch = readResearchStepSnapshot(task.steps.research?.data);
  const initialPlan = readPlanStepSnapshot(task.steps.plan?.data);
  const initialDraft = readDraftStepSnapshot(task.steps.draft?.data);
  const imageDefaults = defaultImageSpec();

  const [phase, setPhase] = useState<StudioPhase>(resolveInitialPhase(initialResearch));
  const [idea, setIdea] = useState(initialResearch?.idea ?? '');
  const [viewpoint, setViewpoint] = useState(initialResearch?.viewpoint ?? '');
  const [researchStream, setResearchStream] = useState(initialResearch?.streamText ?? '');
  const [sources, setSources] = useState(initialResearch?.sources ?? []);
  const [angles, setAngles] = useState(initialResearch?.angles ?? []);
  const [selectedAngleId, setSelectedAngleId] = useState(initialResearch?.selectedAngleId);

  const [planStream, setPlanStream] = useState(initialPlan?.streamText ?? '');
  const [plan, setPlan] = useState<PlanStepSnapshot | undefined>(initialPlan);

  const [draftTone, setDraftTone] = useState(initialDraft?.tone ?? initialPlan?.tone ?? '');
  const [deAiFlavor, setDeAiFlavor] = useState(initialDraft?.deAiFlavor ?? true);
  const [styleSamplesText, setStyleSamplesText] = useState(
    joinStyleSamples(initialDraft?.styleSamples),
  );
  const [draftStream, setDraftStream] = useState(initialDraft?.streamText ?? '');
  const [markdown, setMarkdown] = useState(initialDraft?.markdown ?? '');
  const [titles, setTitles] = useState<string[] | undefined>(initialDraft?.titles);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(initialDraft?.imageSlots ?? []);
  const [imageModel, setImageModel] = useState(
    initialDraft?.imageModel ?? imageDefaults.imageModel,
  );
  const [imageAspectRatio, setImageAspectRatio] = useState(
    initialDraft?.imageAspectRatio ?? imageDefaults.imageAspectRatio,
  );
  const [imageClarity, setImageClarity] = useState(
    initialDraft?.imageClarity ?? imageDefaults.imageClarity,
  );

  const [navLoading, setNavLoading] = useState(false);
  const [researchBuffer] = useState(() =>
    createRafTextBuffer((text) => {
      setResearchStream(text);
      const { json } = extractTrailingJsonBlock(text);
      if (!json) return;
      const parsed = parseResearchPayload(json);
      if (parsed.sources.length) setSources(parsed.sources);
      if (parsed.angles.length) {
        setAngles(parsed.angles);
        setSelectedAngleId((prev) => prev ?? parsed.angles[0]?.id);
      }
    }),
  );
  const [planBuffer] = useState(() => createRafTextBuffer(setPlanStream));
  const [draftBuffer] = useState(() => createRafTextBuffer(setDraftStream));
  const abortRef = useRef<AbortController | null>(null);
  const lastResearchRef = useRef(initialResearch);
  const lastPlanRef = useRef(initialPlan);
  const lastDraftRef = useRef(initialDraft);
  const imageSlotsRef = useRef(imageSlots);
  const selectedAngleIdRef = useRef(selectedAngleId);

  useEffect(() => {
    imageSlotsRef.current = imageSlots;
  }, [imageSlots]);

  useEffect(() => {
    selectedAngleIdRef.current = selectedAngleId;
  }, [selectedAngleId]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      researchBuffer.dispose();
      planBuffer.dispose();
      draftBuffer.dispose();
    },
    [draftBuffer, planBuffer, researchBuffer],
  );

  const selectedAngle: AngleCard | undefined = angles.find((item) => item.id === selectedAngleId);

  async function persistResearch() {
    const next: ResearchStepSnapshot = {
      idea: idea.trim(),
      sources,
      angles,
      ...(viewpoint.trim() ? { viewpoint: viewpoint.trim() } : {}),
      ...(researchStream.trim() ? { streamText: cleanResearchBrief(researchStream) } : {}),
      ...(selectedAngleId ? { selectedAngleId } : {}),
    };
    if (isSameResearchSnapshot(next, lastResearchRef.current)) return next;
    const saved = await saveWechatStep(task.id, 'research', next);
    lastResearchRef.current = saved;
    return saved;
  }

  async function persistPlan() {
    if (!plan) return undefined;
    const next: PlanStepSnapshot = {
      ...plan,
      ...(planStream.trim() ? { streamText: planStream.trim() } : {}),
    };
    if (isSamePlanSnapshot(next, lastPlanRef.current)) return next;
    const saved = await saveWechatStep(task.id, 'plan', next);
    lastPlanRef.current = saved;
    setPlan(saved);
    return saved;
  }

  function toPersistableSlots(slots: ImageSlot[]): ImageSlot[] {
    return slots.map(({ id, role, promptDraft, assetUrl }) => ({
      id,
      role,
      promptDraft,
      ...(assetUrl ? { assetUrl } : {}),
    }));
  }

  async function persistDraft(overrideSlots?: ImageSlot[]) {
    const slots = toPersistableSlots(overrideSlots ?? imageSlots);
    const next: DraftStepSnapshot = {
      markdown,
      imageSlots: slots,
      ...(titles?.length ? { titles } : {}),
      ...(splitStyleSamples(styleSamplesText).length
        ? { styleSamples: splitStyleSamples(styleSamplesText) }
        : {}),
      ...(draftTone.trim() ? { tone: draftTone.trim() } : {}),
      deAiFlavor,
      imageModel,
      imageAspectRatio,
      imageClarity,
      ...(draftStream.trim() ? { streamText: draftStream.trim() } : {}),
    };
    if (isSameDraftSnapshot(next, lastDraftRef.current)) return next;
    const saved = await saveWechatStep(task.id, 'draft', next);
    lastDraftRef.current = saved;
    setMarkdown(saved.markdown);
    setTitles(saved.titles);
    setImageSlots(saved.imageSlots);
    return saved;
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
      console.error('[wechat-article-studio]', url, err);
      message.error(err instanceof Error && err.message ? err.message : failedMessage);
      setPhase(idlePhase);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  async function handleResearch() {
    if (!idea.trim()) {
      message.warning(MISSING_IDEA_WARNING);
      return;
    }
    setSources([]);
    setAngles([]);
    setSelectedAngleId(undefined);
    await runSse(
      '/api/studio/wechat-article/research',
      {
        idea: idea.trim(),
        ...(viewpoint.trim() ? { viewpoint: viewpoint.trim() } : {}),
      },
      researchBuffer,
      RESEARCH_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const parsed = parseResearchPayload(json);
        const brief = cleanResearchBrief(prose || fullText);
        const prevSelected = selectedAngleIdRef.current;
        const selected =
          prevSelected && parsed.angles.some((item) => item.id === prevSelected)
            ? prevSelected
            : parsed.angles[0]?.id;
        setResearchStream(brief);
        setSources(parsed.sources);
        setAngles(parsed.angles);
        setSelectedAngleId(selected);
        setPhase('researched');
        try {
          const next: ResearchStepSnapshot = {
            idea: idea.trim(),
            sources: parsed.sources,
            angles: parsed.angles,
            streamText: brief,
            ...(viewpoint.trim() ? { viewpoint: viewpoint.trim() } : {}),
            ...(selected ? { selectedAngleId: selected } : {}),
          };
          const saved = await saveWechatStep(task.id, 'research', next);
          lastResearchRef.current = saved;
        } catch (err) {
          console.error('[wechat-article-studio] persist research', err);
        }
      },
      'researching',
      'research',
    );
  }

  async function handlePlan() {
    if (!selectedAngle) {
      message.warning(MISSING_ANGLE_WARNING);
      return;
    }
    await runSse(
      '/api/studio/wechat-article/plan',
      {
        idea: idea.trim(),
        angle: selectedAngle,
        sources,
      },
      planBuffer,
      PLAN_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const parsed = parsePlanPayload(json);
        setPlanStream(prose || fullText);
        if (parsed) {
          const nextPlan: PlanStepSnapshot = {
            ...parsed,
            streamText: prose || fullText,
          };
          setPlan(nextPlan);
          setPhase('planned');
          try {
            const saved = await saveWechatStep(task.id, 'plan', nextPlan);
            lastPlanRef.current = saved;
          } catch (err) {
            console.error('[wechat-article-studio] persist plan', err);
          }
          return;
        }
        message.error(PLAN_FAILED);
        setPhase('plan');
      },
      'planning',
      'plan',
    );
  }

  async function handleDraft() {
    if (!selectedAngle) {
      message.warning(MISSING_ANGLE_WARNING);
      return;
    }
    if (!plan) {
      message.warning(MISSING_PLAN_WARNING);
      return;
    }
    const selectedTitle = resolvePlanTitle(plan);
    if (plan.titleDirections?.length && !selectedTitle) {
      message.warning(MISSING_TITLE_WARNING);
      return;
    }
    await runSse(
      '/api/studio/wechat-article/draft',
      {
        idea: idea.trim(),
        angle: selectedAngle,
        plan: {
          beats: plan.beats,
          ...(plan.tone ? { tone: plan.tone } : {}),
          ...(plan.audience ? { audience: plan.audience } : {}),
          ...(selectedTitle ? { title: selectedTitle } : {}),
        },
        ...(draftTone.trim() ? { tone: draftTone.trim() } : {}),
        deAiFlavor,
        styleSamples: splitStyleSamples(styleSamplesText),
      },
      draftBuffer,
      DRAFT_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const meta = parseDraftMeta(json);
        const body = prose || fullText;
        const prevSlots = imageSlotsRef.current;
        const nextSlots = meta.imageSlots.length
          ? meta.imageSlots.map((slot) => ({
              ...slot,
              assetUrl: prevSlots.find((item) => item.id === slot.id)?.assetUrl,
            }))
          : prevSlots;
        const nextTitles = selectedTitle ? [selectedTitle] : meta.titles;
        setDraftStream(fullText);
        setMarkdown(body);
        setTitles(nextTitles);
        setImageSlots(nextSlots);
        setPhase('drafted');
        try {
          const next: DraftStepSnapshot = {
            markdown: body,
            imageSlots: toPersistableSlots(nextSlots),
            ...(nextTitles?.length ? { titles: nextTitles } : {}),
            ...(splitStyleSamples(styleSamplesText).length
              ? { styleSamples: splitStyleSamples(styleSamplesText) }
              : {}),
            ...(draftTone.trim() ? { tone: draftTone.trim() } : {}),
            deAiFlavor,
            imageModel,
            imageAspectRatio,
            imageClarity,
            streamText: fullText,
          };
          const saved = await saveWechatStep(task.id, 'draft', next);
          lastDraftRef.current = saved;
          setImageSlots(saved.imageSlots);
        } catch (err) {
          console.error('[wechat-article-studio] persist draft', err);
        }
      },
      'drafting',
      'draft',
    );
  }

  async function handleGenerateSlot(slotId: string) {
    const slot = imageSlots.find((item) => item.id === slotId);
    if (!slot?.promptDraft.trim()) {
      message.warning('请先填写配图提示词');
      return;
    }
    setImageSlots((current) =>
      current.map((item) => (item.id === slotId ? { ...item, generating: true } : item)),
    );
    try {
      const quality = getModelCapability(imageModel)?.qualityDefault ?? 'high';
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'wechatInline',
          count: 1,
          model: imageModel,
          aspectRatio: imageAspectRatio,
          quality,
          clarity: imageClarity,
          prompt: slot.promptDraft.trim(),
          slotIds: [slotId],
        }),
      });
      await assertOkOrJsonFail(res);
      let nextUrl: string | undefined;
      await consumeGenerateNdjson(res, (event) => {
        if (event.slotId !== slotId) return;
        if (event.error) {
          message.error(event.error);
          return;
        }
        if (event.url) nextUrl = event.url;
      });
      const nextSlots = imageSlotsRef.current.map((item) =>
        item.id === slotId
          ? { ...item, ...(nextUrl ? { assetUrl: nextUrl } : {}), generating: false }
          : { ...item, generating: false },
      );
      setImageSlots(nextSlots);
      if (nextUrl) {
        try {
          await persistDraft(nextSlots);
        } catch (err) {
          console.error('[wechat-article-studio] persist after generate', err);
        }
      }
    } catch (err) {
      if (!isAbortError(err)) {
        console.error('[wechat-article-studio] generate slot', err);
        message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      }
      setImageSlots((current) =>
        current.map((item) => (item.id === slotId ? { ...item, generating: false } : item)),
      );
    }
  }

  async function handleCopyArticle() {
    try {
      await copyText(buildCopyArticleText(titles, markdown));
      message.success(COPY_OK);
    } catch {
      message.error(COPY_FAILED);
    }
  }

  async function handleCopyImage(url: string) {
    try {
      await copyImageFromUrl(url);
      message.success(COPY_OK);
    } catch {
      message.error(COPY_IMAGE_FAILED);
    }
  }

  async function handleNext() {
    setNavLoading(true);
    try {
      if (phase === 'researched') {
        if (!selectedAngleId) {
          message.warning(MISSING_ANGLE_WARNING);
          return;
        }
        await persistResearch();
        setPhase(plan ? 'planned' : 'plan');
        return;
      }
      if (phase === 'planned') {
        if (!plan) {
          message.warning(MISSING_PLAN_WARNING);
          return;
        }
        if (plan.titleDirections?.length && !resolvePlanTitle(plan)) {
          message.warning(MISSING_TITLE_WARNING);
          return;
        }
        await persistPlan();
        setPhase(markdown.trim() ? 'drafted' : 'draft');
        return;
      }
      if (phase === 'drafted') {
        await persistDraft();
        setPhase('complete');
      }
    } catch (err) {
      console.error('[wechat-article-studio] next', err);
    } finally {
      setNavLoading(false);
    }
  }

  function handlePrev() {
    if (phase === 'complete') {
      setPhase('drafted');
      return;
    }
    if (phase === 'draft' || phase === 'drafted') {
      setPhase('planned');
      return;
    }
    if (phase === 'plan' || phase === 'planned') {
      setPhase('researched');
    }
  }

  function updatePlanField<K extends keyof PlanStepSnapshot>(key: K, value: PlanStepSnapshot[K]) {
    setPlan((current) => (current ? { ...current, [key]: value } : current));
  }

  function selectTitleDirection(index: number) {
    setPlan((current) =>
      current?.titleDirections?.length
        ? { ...current, selectedTitleIndex: index }
        : current,
    );
  }

  function changeTitleDirection(index: number, value: string) {
    setPlan((current) => {
      if (!current?.titleDirections?.length) return current;
      const nextTitles = [...current.titleDirections];
      nextTitles[index] = value;
      return { ...current, titleDirections: nextTitles };
    });
  }

  function updateSlotPrompt(slotId: string, promptDraft: string) {
    setImageSlots((current) =>
      current.map((item) => (item.id === slotId ? { ...item, promptDraft } : item)),
    );
  }

  function addEmptySlot() {
    const id = `inline-${crypto.randomUUID().slice(0, 8)}`;
    setImageSlots((current) => [...current, { id, role: 'inline', promptDraft: '' }]);
  }

  return {
    phase,
    idea,
    setIdea,
    viewpoint,
    setViewpoint,
    researchStream,
    sources,
    angles,
    selectedAngleId,
    setSelectedAngleId,
    selectedAngle,
    planStream,
    plan,
    updatePlanField,
    selectTitleDirection,
    changeTitleDirection,
    draftTone,
    setDraftTone,
    deAiFlavor,
    setDeAiFlavor,
    styleSamplesText,
    setStyleSamplesText,
    draftStream,
    markdown,
    setMarkdown,
    titles,
    imageSlots,
    imageModel,
    setImageModel,
    imageAspectRatio,
    setImageAspectRatio,
    imageClarity,
    setImageClarity,
    navLoading,
    handleResearch,
    handlePlan,
    handleDraft,
    handleGenerateSlot,
    handleCopyArticle,
    handleCopyImage,
    handleNext,
    handlePrev,
    updateSlotPrompt,
    addEmptySlot,
  };
}
