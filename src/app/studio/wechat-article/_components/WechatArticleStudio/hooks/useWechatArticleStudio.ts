import { useEffect, useRef, useState } from 'react';
import { App, Form } from 'antd';
import type { WechatArticleTaskDetail } from '@/app/api/studio/wechat-article/_shared/task-types';
import { validateForm } from '@/app/studio/_utils/form-validate';
import { getModelCapability, resolveClarityForModel } from '@/app/studio/_utils/model-options';
import { readUploadItemAsDataUrl } from '@/app/studio/_utils/upload-items';
import {
  revokeLocalUploadItemUrls,
  revokeReplacedLocalUploadItemUrls,
} from '@/lib/shared/client/upload-items';
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
  MISSING_MARKDOWN_WARNING,
  MISSING_PLAN_WARNING,
  MISSING_TITLE_WARNING,
  PLAN_FAILED,
  RESEARCH_FAILED,
  UPLOAD_FAILED,
  WATERMARK_FAILED,
} from '../constants';
import type {
  AngleCard,
  DraftStepSnapshot,
  ImageHistoryItem,
  ImageSlot,
  PlanStepSnapshot,
  ResearchStepSnapshot,
  StudioPhase,
  WechatPanelValues,
} from '../types';
import {
  assertOkOrJsonFail,
  buildCopyArticleText,
  composeWatermark,
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
  resolveInitialPhase,
  resolvePlanTitle,
  saveWechatStep,
  toImageItems,
  toPersistableImageUrl,
} from '../utils';
import { formatStyleSelections } from '@/business-components/StyleDimensionPicker';

/** 管理公众号五步：调研 → 思路 → 成稿 → 成稿配图 → 完成。 */
export function useWechatArticleStudio(task: WechatArticleTaskDetail) {
  const { message } = App.useApp();
  const initialResearch = readResearchStepSnapshot(task.steps.research?.data);
  const initialPlan = readPlanStepSnapshot(task.steps.plan?.data);
  const initialDraft = readDraftStepSnapshot(task.steps.draft?.data);
  const imageDefaults = defaultImageSpec();

  const [phase, setPhase] = useState<StudioPhase>(resolveInitialPhase(initialResearch));
  const [panelForm] = Form.useForm<WechatPanelValues>();
  // 左栏初值只算一次：Form 二次挂载是 store 赢（只补缺失键），重算只会白白多渲染
  const [panelInitialValues] = useState<WechatPanelValues>(() => ({
    idea: initialResearch?.idea ?? '',
    viewpoint: initialResearch?.viewpoint ?? '',
    styleSelections: initialDraft?.styleSelections ?? {},
    lengthLimit: initialDraft?.lengthLimit,
    watermarkImages: toImageItems(initialDraft?.watermarkUrl),
    styleReferenceImages: toImageItems(initialDraft?.styleReferenceUrl),
  }));
  const [researchStream, setResearchStream] = useState(initialResearch?.streamText ?? '');
  const [sources, setSources] = useState(initialResearch?.sources ?? []);
  const [angles, setAngles] = useState(initialResearch?.angles ?? []);
  const [selectedAngleId, setSelectedAngleId] = useState(initialResearch?.selectedAngleId);

  const [planStream, setPlanStream] = useState(initialPlan?.streamText ?? '');
  const [plan, setPlan] = useState<PlanStepSnapshot | undefined>(initialPlan);

  const [draftStream, setDraftStream] = useState(initialDraft?.streamText ?? '');
  const [imagesStream, setImagesStream] = useState('');
  const [markdown, setMarkdown] = useState(initialDraft?.markdown ?? '');
  const [titles, setTitles] = useState<string[] | undefined>(initialDraft?.titles);
  const [imageSlots, setImageSlots] = useState<ImageSlot[]>(initialDraft?.imageSlots ?? []);
  const [imageHistory, setImageHistory] = useState<ImageHistoryItem[]>(
    initialDraft?.imageHistory ?? [],
  );
  const [imageVisualStyle, setImageVisualStyle] = useState(initialDraft?.imageVisualStyle ?? '');
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
  /** 落盘请求序号：只让最后一次的响应回写 store 与基线，避免旧响应覆盖新状态 */
  const persistSeqRef = useRef(0);
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

  // 供请求与落盘取用；preserve 让左栏卸载后也读得到，首帧 store 未播种时回落到初值
  const watched = Form.useWatch([], { form: panelForm, preserve: true });
  const panelValues: WechatPanelValues = watched ?? panelInitialValues;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      researchBuffer.dispose();
      planBuffer.dispose();
      draftBuffer.dispose();
      imagesBuffer.dispose();
      // 面板卸载后 store 仍保留本次会话的值，故用 getFieldsValue(true) 读整表；
      // 重复释放同一个 object URL 是幂等的
      const values = panelForm.getFieldsValue(true);
      revokeLocalUploadItemUrls(values.watermarkImages ?? []);
      revokeLocalUploadItemUrls(values.styleReferenceImages ?? []);
    },
    [draftBuffer, imagesBuffer, panelForm, planBuffer, researchBuffer],
  );

  const selectedAngle: AngleCard | undefined = angles.find((item) => item.id === selectedAngleId);

  async function persistResearch() {
    const { idea, viewpoint } = panelValues;
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
  }) {
    // 取值全部走 store：panelValues 是渲染闭包里的快照，useWatch 的通知要等下一帧才生效，
    // 同一事件里若有人先写过 store（如粘贴文风、上传回写），从这里读闭包会拿到上一轮的值
    const values = panelForm.getFieldsValue(true);
    const { styleSelections, lengthLimit } = values;
    const slots = toPersistableSlots(overrides?.slots ?? imageSlots);
    const history = toPersistableHistory(overrides?.history ?? imageHistory);
    const visualStyle = (overrides?.imageVisualStyle ?? imageVisualStyle).trim();
    const styleRef = await toPersistableImageUrl(values.styleReferenceImages ?? []);
    const watermark = await toPersistableImageUrl(values.watermarkImages ?? []);
    const next: DraftStepSnapshot = {
      markdown: overrides?.markdown ?? markdown,
      imageSlots: slots,
      ...(history.length ? { imageHistory: history } : {}),
      ...(visualStyle ? { imageVisualStyle: visualStyle } : {}),
      ...(styleRef ? { styleReferenceUrl: styleRef } : {}),
      ...(watermark ? { watermarkUrl: watermark } : {}),
      ...(titles?.length ? { titles } : {}),
      ...(Object.keys(styleSelections).length ? { styleSelections } : {}),
      ...(lengthLimit !== undefined ? { lengthLimit } : {}),
      imageModel,
      imageAspectRatio,
      imageClarity,
      ...(draftStream.trim() ? { streamText: draftStream.trim() } : {}),
    };
    if (isSameDraftSnapshot(next, lastDraftRef.current)) return next;
    const seq = (persistSeqRef.current += 1);
    const saved = await saveWechatStep(task.id, 'draft', next);
    // 连传两张图会并发出两次落盘（各自带着不同的快照）。旧响应若后到，它的回写会把新传的那张
    // 从 store 里抹掉、顺手 revoke 掉仍在引用的 object URL，故只接受最后一次的响应
    if (seq !== persistSeqRef.current) return saved;
    lastDraftRef.current = saved;
    setMarkdown(saved.markdown);
    setTitles(saved.titles);
    setImageSlots(saved.imageSlots);
    setImageHistory(saved.imageHistory ?? []);
    setImageVisualStyle(saved.imageVisualStyle ?? '');
    revokeReplacedLocalUploadItemUrls(
      values.styleReferenceImages ?? [],
      toImageItems(saved.styleReferenceUrl),
    );
    revokeReplacedLocalUploadItemUrls(
      values.watermarkImages ?? [],
      toImageItems(saved.watermarkUrl),
    );
    // 服务端已把本地文件换成资产 URL，必须写回 store：否则下次比对时基线永远对不上，
    // 每回落盘都会重传一次这两张图。setFieldsValue 不触发 onValuesChange，不会与用户输入形成回环
    panelForm.setFieldsValue({
      styleReferenceImages: toImageItems(saved.styleReferenceUrl),
      watermarkImages: toImageItems(saved.watermarkUrl),
    });
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
    if (!(await validateForm(panelForm))) return;
    const { idea, viewpoint } = panelValues;
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
        idea: panelValues.idea.trim(),
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
    if (!(await validateForm(panelForm))) return;
    const { idea, lengthLimit, styleSelections } = panelValues;
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
    const styleReference = panelValues.styleReferenceImages[0];
    let styleReferenceDataUrl: string | undefined;
    if (styleReference) {
      try {
        styleReferenceDataUrl = await readUploadItemAsDataUrl(styleReference);
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

  /** 出图后叠加水印：未上传水印图则原样返回；叠加失败只告警，不让整张图白跑。 */
  async function withWatermark(url: string): Promise<string> {
    const watermark = panelValues.watermarkImages[0];
    if (!watermark) return url;
    try {
      return await composeWatermark(url, await readUploadItemAsDataUrl(watermark));
    } catch (err) {
      console.error('[wechat-article-studio] compose watermark', err);
      message.warning(WATERMARK_FAILED);
      return url;
    }
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
      if (nextUrl) nextUrl = await withWatermark(nextUrl);
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
      // 成稿配图非必须：images（未规划）与 illustrated（已规划）均可进预览
      if (phase === 'images' || phase === 'illustrated') {
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

  /**
   * 左栏字段变化。
   *
   * 水印图与风格参考图是「改完即落盘」：上传组件只负责回写 store，落盘得靠这里补上。
   * 其余字段不在这里写——它们等各自步骤的动作（开始调研 / 生成正文 / 规划配图）统一落盘。
   * 这份 Form 的 onValuesChange 只在用户改值（内部 trigger）时触发，setFieldsValue 不会走到这里，无回环。
   */
  async function handlePanelFieldChange(changed: Partial<WechatPanelValues>) {
    if (!('styleReferenceImages' in changed) && !('watermarkImages' in changed)) return;
    try {
      await persistDraft();
    } catch (err) {
      console.error('[wechat-article-studio] persist reference images', err);
    }
  }

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
    panelForm,
    panelInitialValues,
    panelValues,
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
    draftStream,
    imagesStream,
    markdown,
    setMarkdown,
    titles,
    imageSlots,
    imageHistory,
    imageVisualStyle,
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
    handlePanelFieldChange,
  };
}
