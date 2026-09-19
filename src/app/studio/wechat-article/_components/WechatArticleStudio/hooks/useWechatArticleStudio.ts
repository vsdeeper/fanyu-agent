import { useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { WechatArticleTaskDetail } from '@/app/api/studio/wechat-article/_shared/task-types';
import { getModelCapability, resolveClarityForModel } from '@/app/studio/_utils/model-options';
import {
  COPY_FAILED,
  COPY_IMAGE_FAILED,
  COPY_OK,
  DEFAULT_IMAGE_ASPECT,
  DEFAULT_IMAGE_CLARITY,
  DEFAULT_IMAGE_MODEL,
  DRAFT_FAILED,
  GENERATE_FAILED,
  HISTORY_DELETE_FAILED,
  IMAGES_FAILED,
  MISSING_ACTIVE_SLOT_WARNING,
  MISSING_ANGLE_WARNING,
  MISSING_IDEA_WARNING,
  MISSING_MARKDOWN_WARNING,
  MISSING_PLAN_WARNING,
  MISSING_STYLE_WARNING,
  MISSING_TITLE_WARNING,
  PLAN_FAILED,
  RESEARCH_FAILED,
  UPLOAD_FAILED,
} from '../constants';
import type {
  AngleCard,
  DraftStepSnapshot,
  ImageHistoryItem,
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
  ensureMarkdownLeadingTitle,
  extractTrailingJsonBlock,
  isAbortError,
  isSameDraftSnapshot,
  isSamePlanSnapshot,
  isSameResearchSnapshot,
  mergeSlotsIntoHistory,
  parseImageSlots,
  parseImageVisualStyle,
  parsePlanPayload,
  parseResearchPayload,
  readDraftStepSnapshot,
  readFileAsDataUrl,
  readPlanStepSnapshot,
  readResearchStepSnapshot,
  resolveImageDataUrl,
  resolveInitialPhase,
  resolvePlanTitle,
  saveWechatStep,
} from '../utils';
import {
  formatStyleSelections,
  hasStyleSelection,
  type StyleDimensionSelections,
} from '@/business-components/StyleDimensionPicker';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload/types';

const STYLE_REFERENCE_UID = 'style-reference';

/** 管理公众号五步：调研 → 思路 → 成稿 → 成稿配图 → 完成。 */
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

  const [styleSelections, setStyleSelections] = useState<StyleDimensionSelections>(
    initialDraft?.styleSelections ?? {},
  );
  const [lengthLimit, setLengthLimit] = useState<number | undefined>(initialDraft?.lengthLimit);
  const [draftStream, setDraftStream] = useState(initialDraft?.streamText ?? '');
  const [imagesStream, setImagesStream] = useState('');
  const [markdown, setMarkdown] = useState(initialDraft?.markdown ?? '');
  const [titles, setTitles] = useState<string[] | undefined>(initialDraft?.titles);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(initialDraft?.imageSlots ?? []);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>(
    initialDraft?.imageHistory ?? [],
  );
  const [imageVisualStyle, setImageVisualStyle] = useState(initialDraft?.imageVisualStyle ?? '');
  const [styleReferenceUrl, setStyleReferenceUrl] = useState(initialDraft?.styleReferenceUrl ?? '');
  const [imageModel, setImageModel] = useState(
    initialDraft?.imageModel ?? imageDefaults.imageModel,
  );
  const [imageAspectRatio, setImageAspectRatio] = useState(
    initialDraft?.imageAspectRatio ?? imageDefaults.imageAspectRatio,
  );
  const [imageClarity, setImageClarity] = useState(
    initialDraft?.imageClarity ?? imageDefaults.imageClarity,
  );
  const [slotDrawerOpen, setSlotDrawerOpen] = useState(false);
  const [activeSlotId, setActiveSlotId] = useState<string | undefined>();

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
  const [imagesBuffer] = useState(() => createRafTextBuffer(setImagesStream));
  const abortRef = useRef<AbortController | null>(null);
  const lastResearchRef = useRef(initialResearch);
  const lastPlanRef = useRef(initialPlan);
  const lastDraftRef = useRef(initialDraft);
  const imageSlotsRef = useRef(imageSlots);
  const imageHistoryRef = useRef(imageHistory);
  const activeSlotIdRef = useRef(activeSlotId);
  const selectedAngleIdRef = useRef(selectedAngleId);

  useEffect(() => {
    imageSlotsRef.current = imageSlots;
  }, [imageSlots]);

  useEffect(() => {
    imageHistoryRef.current = imageHistory;
  }, [imageHistory]);

  useEffect(() => {
    activeSlotIdRef.current = activeSlotId;
  }, [activeSlotId]);

  useEffect(() => {
    selectedAngleIdRef.current = selectedAngleId;
  }, [selectedAngleId]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      researchBuffer.dispose();
      planBuffer.dispose();
      draftBuffer.dispose();
      imagesBuffer.dispose();
    },
    [draftBuffer, imagesBuffer, planBuffer, researchBuffer],
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
    return slots.map(({ id, label, role, promptDraft, aspectRatio, model, clarity, assetUrl }) => ({
      id,
      label,
      role,
      promptDraft,
      aspectRatio: aspectRatio?.trim() || DEFAULT_IMAGE_ASPECT,
      model: model?.trim() || DEFAULT_IMAGE_MODEL,
      clarity: clarity?.trim() || DEFAULT_IMAGE_CLARITY,
      ...(assetUrl ? { assetUrl } : {}),
    }));
  }

  function toPersistableHistory(history: ImageHistoryItem[]): ImageHistoryItem[] {
    return history.map(({ id, assetUrl, label, promptDraft }) => ({
      id,
      assetUrl,
      ...(label ? { label } : {}),
      ...(promptDraft ? { promptDraft } : {}),
    }));
  }

  async function persistDraft(overrides?: {
    markdown?: string;
    slots?: ImageSlot[];
    history?: ImageHistoryItem[];
    imageVisualStyle?: string;
    styleReferenceUrl?: string;
  }) {
    const slots = toPersistableSlots(overrides?.slots ?? imageSlots);
    const history = toPersistableHistory(overrides?.history ?? imageHistory);
    const visualStyle = (overrides?.imageVisualStyle ?? imageVisualStyle).trim();
    const styleRef = (overrides?.styleReferenceUrl ?? styleReferenceUrl).trim();
    const next: DraftStepSnapshot = {
      markdown: overrides?.markdown ?? markdown,
      imageSlots: slots,
      ...(history.length ? { imageHistory: history } : {}),
      ...(visualStyle ? { imageVisualStyle: visualStyle } : {}),
      ...(styleRef ? { styleReferenceUrl: styleRef } : {}),
      ...(titles?.length ? { titles } : {}),
      ...(Object.keys(styleSelections).length ? { styleSelections } : {}),
      ...(lengthLimit !== undefined ? { lengthLimit } : {}),
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
    setImageHistory(saved.imageHistory ?? []);
    setImageVisualStyle(saved.imageVisualStyle ?? '');
    setStyleReferenceUrl(saved.styleReferenceUrl ?? '');
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
    if (!hasStyleSelection(styleSelections)) {
      message.warning(MISSING_STYLE_WARNING);
      return;
    }
    const stylePrompt = formatStyleSelections(styleSelections);
    await runSse(
      '/api/studio/wechat-article/draft',
      {
        idea: idea.trim(),
        angle: selectedAngle,
        plan: {
          beats: plan.beats,
          ...(plan.audience ? { audience: plan.audience } : {}),
          ...(selectedTitle ? { title: selectedTitle } : {}),
        },
        stylePrompt,
        ...(lengthLimit !== undefined ? { lengthLimit } : {}),
      },
      draftBuffer,
      DRAFT_FAILED,
      async (fullText) => {
        const { prose } = extractTrailingJsonBlock(fullText);
        const rawBody = prose || fullText;
        const nextTitles = selectedTitle ? [selectedTitle] : titles;
        const body = ensureMarkdownLeadingTitle(nextTitles?.[0], rawBody);
        const nextHistory = mergeSlotsIntoHistory(imageHistoryRef.current, imageSlotsRef.current);
        setDraftStream(fullText);
        setMarkdown(body);
        setTitles(nextTitles);
        setImageSlots([]);
        setImageHistory(nextHistory);
        setImageVisualStyle('');
        setActiveSlotId(undefined);
        setSlotDrawerOpen(false);
        setPhase('drafted');
        try {
          const next: DraftStepSnapshot = {
            markdown: body,
            imageSlots: [],
            ...(nextHistory.length ? { imageHistory: toPersistableHistory(nextHistory) } : {}),
            ...(nextTitles?.length ? { titles: nextTitles } : {}),
            ...(Object.keys(styleSelections).length ? { styleSelections } : {}),
            ...(lengthLimit !== undefined ? { lengthLimit } : {}),
            imageModel,
            imageAspectRatio,
            imageClarity,
            streamText: fullText,
          };
          const saved = await saveWechatStep(task.id, 'draft', next);
          lastDraftRef.current = saved;
          setImageHistory(saved.imageHistory ?? []);
          setImageVisualStyle(saved.imageVisualStyle ?? '');
        } catch (err) {
          console.error('[wechat-article-studio] persist draft', err);
        }
      },
      'drafting',
      'draft',
    );
  }

  async function handlePlanImages() {
    if (!markdown.trim()) {
      message.warning(MISSING_MARKDOWN_WARNING);
      return;
    }
    const selectedTitle = titles?.[0] ?? (plan ? resolvePlanTitle(plan) : undefined);
    let styleReferenceDataUrl: string | undefined;
    if (styleReferenceUrl.trim()) {
      try {
        styleReferenceDataUrl = await resolveImageDataUrl(styleReferenceUrl.trim());
      } catch (err) {
        console.error('[wechat-article-studio] style reference', err);
        message.error('风格参考图读取失败，请重新上传');
        return;
      }
    }
    await runSse(
      '/api/studio/wechat-article/images',
      {
        markdown: markdown.trim(),
        ...(selectedTitle ? { title: selectedTitle } : {}),
        ...(styleReferenceDataUrl ? { styleReferenceDataUrl } : {}),
      },
      imagesBuffer,
      IMAGES_FAILED,
      async (fullText) => {
        const { prose, json } = extractTrailingJsonBlock(fullText);
        const prevById = new Map(imageSlotsRef.current.map((item) => [item.id, item] as const));
        const nextSlots = parseImageSlots(json).map((slot) => {
          const prev = prevById.get(slot.id);
          const model = prev?.model ?? slot.model ?? DEFAULT_IMAGE_MODEL;
          return {
            ...slot,
            aspectRatio: prev?.aspectRatio ?? slot.aspectRatio ?? DEFAULT_IMAGE_ASPECT,
            model,
            clarity:
              prev?.clarity ?? slot.clarity ?? resolveClarityForModel(model, DEFAULT_IMAGE_CLARITY),
          };
        });
        if (!nextSlots.length) {
          message.error(IMAGES_FAILED);
          setPhase('images');
          return;
        }
        const nextVisualStyle = parseImageVisualStyle(json) ?? '';
        const nextHistory = mergeSlotsIntoHistory(imageHistoryRef.current, imageSlotsRef.current);
        const body = (prose || fullText).trim();
        setImagesStream(fullText);
        setMarkdown(body);
        setImageSlots(nextSlots);
        setImageVisualStyle(nextVisualStyle);
        setImageHistory(nextHistory);
        setPhase('illustrated');
        try {
          await persistDraft({
            markdown: body,
            slots: nextSlots,
            history: nextHistory,
            imageVisualStyle: nextVisualStyle,
          });
        } catch (err) {
          console.error('[wechat-article-studio] persist images', err);
        }
      },
      'illustrating',
      'images',
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
      const model = slot.model?.trim() || DEFAULT_IMAGE_MODEL;
      const clarity = slot.clarity?.trim() || resolveClarityForModel(model, DEFAULT_IMAGE_CLARITY);
      const quality = getModelCapability(model)?.qualityDefault ?? 'high';
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'wechatInline',
          count: 1,
          model,
          aspectRatio: slot.aspectRatio?.trim() || DEFAULT_IMAGE_ASPECT,
          quality,
          clarity,
          prompt: slot.promptDraft.trim(),
          ...(imageVisualStyle.trim() ? { visualStyle: imageVisualStyle.trim() } : {}),
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
          await persistDraft({ slots: nextSlots });
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

  async function handleUploadSlot(slotId: string, file: File) {
    try {
      if (!file.type.startsWith('image/')) {
        message.warning('请选择图片文件');
        return;
      }
      const dataUrl = await readFileAsDataUrl(file);
      const nextSlots = imageSlotsRef.current.map((item) =>
        item.id === slotId ? { ...item, assetUrl: dataUrl } : item,
      );
      setImageSlots(nextSlots);
      setActiveSlotId(slotId);
      try {
        await persistDraft({ slots: nextSlots });
      } catch (err) {
        console.error('[wechat-article-studio] persist after upload', err);
        message.warning('图片已填入槽位，但保存失败，请稍后重试');
      }
    } catch (err) {
      console.error('[wechat-article-studio] upload slot', err);
      message.error(UPLOAD_FAILED);
    }
  }

  async function handleApplyHistory(historyId: string) {
    const targetId = activeSlotIdRef.current;
    if (!targetId) {
      message.warning(MISSING_ACTIVE_SLOT_WARNING);
      return;
    }
    const historyItem = imageHistoryRef.current.find((item) => item.id === historyId);
    if (!historyItem) return;
    const nextSlots = imageSlotsRef.current.map((item) =>
      item.id === targetId ? { ...item, assetUrl: historyItem.assetUrl } : item,
    );
    setImageSlots(nextSlots);
    try {
      await persistDraft({ slots: nextSlots });
    } catch (err) {
      console.error('[wechat-article-studio] apply history', err);
    }
  }

  /** 删除一条旧槽位图：立即落盘（不等「下一步」）。 */
  async function handleRemoveHistory(historyId: string) {
    const nextHistory = imageHistoryRef.current.filter((item) => item.id !== historyId);
    if (nextHistory.length === imageHistoryRef.current.length) return;
    setImageHistory(nextHistory);
    try {
      await persistDraft({ history: nextHistory });
    } catch (err) {
      console.error('[wechat-article-studio] remove history', err);
      message.warning(HISTORY_DELETE_FAILED);
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
        setPhase(imageSlots.length ? 'illustrated' : 'images');
        return;
      }
      if (phase === 'illustrated') {
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
      setPhase(imageSlots.length ? 'illustrated' : 'images');
      return;
    }
    if (phase === 'images' || phase === 'illustrated') {
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
      current?.titleDirections?.length ? { ...current, selectedTitleIndex: index } : current,
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

  function updateSlotAspectRatio(slotId: string, aspectRatio: string) {
    setImageSlots((current) =>
      current.map((item) => (item.id === slotId ? { ...item, aspectRatio } : item)),
    );
  }

  function updateSlotModel(slotId: string, model: string) {
    setImageSlots((current) =>
      current.map((item) => (item.id === slotId ? { ...item, model } : item)),
    );
  }

  function updateSlotClarity(slotId: string, clarity: string) {
    setImageSlots((current) =>
      current.map((item) => (item.id === slotId ? { ...item, clarity } : item)),
    );
  }

  function updateImageVisualStyle(value: string) {
    setImageVisualStyle(value);
  }

  async function handleStyleReferenceAppend(files: File[]) {
    const first = files[0];
    if (!first) return;
    try {
      const dataUrl = await readFileAsDataUrl(first);
      setStyleReferenceUrl(dataUrl);
      try {
        await persistDraft({ styleReferenceUrl: dataUrl });
      } catch (err) {
        console.error('[wechat-article-studio] persist style reference', err);
      }
    } catch (err) {
      console.error('[wechat-article-studio] style reference upload', err);
      message.error(UPLOAD_FAILED);
    }
  }

  async function handleStyleReferenceRemove(_uid: string) {
    setStyleReferenceUrl('');
    try {
      await persistDraft({ styleReferenceUrl: '' });
    } catch (err) {
      console.error('[wechat-article-studio] clear style reference', err);
    }
  }

  const styleReferenceImages: StudioImageUploadItem[] = styleReferenceUrl.trim()
    ? [{ uid: STYLE_REFERENCE_UID, previewUrl: styleReferenceUrl.trim() }]
    : [];

  function openSlotDrawer(slotId?: string) {
    const nextId = slotId ?? imageSlots[0]?.id;
    setActiveSlotId(nextId);
    setSlotDrawerOpen(true);
    if (nextId) {
      requestAnimationFrame(() => {
        document.getElementById(`wechat-slot-${nextId}`)?.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        });
      });
    }
  }

  function closeSlotDrawer() {
    setSlotDrawerOpen(false);
  }

  function selectSlot(slotId: string) {
    setActiveSlotId(slotId);
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
    styleSelections,
    setStyleSelections,
    lengthLimit,
    setLengthLimit,
    draftStream,
    imagesStream,
    markdown,
    setMarkdown,
    titles,
    imageSlots,
    imageHistory,
    imageVisualStyle,
    styleReferenceImages,
    imageModel,
    setImageModel,
    imageAspectRatio,
    setImageAspectRatio,
    imageClarity,
    setImageClarity,
    slotDrawerOpen,
    activeSlotId,
    openSlotDrawer,
    closeSlotDrawer,
    selectSlot,
    navLoading,
    handleResearch,
    handlePlan,
    handleDraft,
    handlePlanImages,
    handleGenerateSlot,
    handleUploadSlot,
    handleApplyHistory,
    handleRemoveHistory,
    handleCopyArticle,
    handleCopyImage,
    handleNext,
    handlePrev,
    updateSlotPrompt,
    updateSlotAspectRatio,
    updateSlotModel,
    updateSlotClarity,
    updateImageVisualStyle,
    handleStyleReferenceAppend,
    handleStyleReferenceRemove,
  };
}
