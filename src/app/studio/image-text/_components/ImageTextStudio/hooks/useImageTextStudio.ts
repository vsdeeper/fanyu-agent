import { useEffect, useRef, useState } from 'react';
import { App, Form } from 'antd';
import type { FormInstance } from 'antd';
import type { ImageTextTaskDetail } from '@/app/api/studio/image-text/_shared/task-types';
import type { GenerateSpecFields } from '@/app/studio/_utils/model-options';
import { validateForm } from '@/app/studio/_utils/form-validate';
import { getModelCapability, resolveClarityForModel } from '@/app/studio/_utils/model-options';
import { readUploadItemAsDataUrl } from '@/app/studio/_utils/upload-items';
import { revokeReplacedLocalUploadItemUrls } from '@/lib/shared/client/upload-items';
import type { StudioImageUploadItem } from '@/app/studio/_components/StudioImageUpload';
import {
  DEFAULT_GENERATE_CARD_ID,
  DEFAULT_GENERATE_CARD_TITLE,
  DEFAULT_IMAGE_ASPECT,
  DEFAULT_IMAGE_CLARITY,
  DEFAULT_IMAGE_MODEL,
  GENERATE_FAILED,
  MISSING_BODY_WARNING,
  MISSING_PREVIEW_WARNING,
  PERSIST_FAILED,
  PLAN_FAILED,
  PLAN_PARSE_FAILED,
} from '../constants';
import type {
  ImageTextGenerateSnapshot,
  ImageTextGeneratedImage,
  ImageTextPanelValues,
  ImageTextPhase,
  ImageTextPlanSnapshot,
  ImageTextView,
} from '../types';
import {
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  consumeGenerateNdjson,
  createRafTextBuffer,
  isAbortError,
  normalizeCardBody,
  parseCaptionFromBody,
  readGenerateSnapshot,
  readPlanSnapshot,
  resolveInitialPhase,
  saveImageTextStep,
  stripCaptionFromBody,
  titleFromBody,
  toImageItems,
  toMaterialItems,
  toPersistableImageUrl,
} from '../utils';

function defaultSpec(): GenerateSpecFields {
  const capability = getModelCapability(DEFAULT_IMAGE_MODEL);
  return {
    model: DEFAULT_IMAGE_MODEL,
    aspectRatio: DEFAULT_IMAGE_ASPECT,
    quality: capability?.qualityDefault ?? 'high',
    clarity: capability?.clarityDefault ?? DEFAULT_IMAGE_CLARITY,
    count: '1',
  };
}

function applySingleImageUrl(
  form: FormInstance<ImageTextPanelValues>,
  field: 'styleReferenceImages' | 'characterModelImages',
  url: string | undefined,
) {
  const previous = (form.getFieldValue(field) ?? []) as StudioImageUploadItem[];
  const next = url ? [{ uid: previous[0]?.uid ?? crypto.randomUUID(), previewUrl: url }] : [];
  revokeReplacedLocalUploadItemUrls(previous, next);
  form.setFieldValue(field, next);
}

/** 管理图文三步：内容 → 生成 → 预览。 */
export function useImageTextStudio(task: ImageTextTaskDetail) {
  const { message } = App.useApp();
  const initialPlan = readPlanSnapshot(task.steps.plan?.data);
  const initialGenerate = readGenerateSnapshot(task.steps.generate?.data);

  const [phase, setPhase] = useState<ImageTextPhase>(
    resolveInitialPhase(initialPlan, initialGenerate),
  );
  const [panelForm] = Form.useForm<ImageTextPanelValues>();
  const [panelInitialValues] = useState<ImageTextPanelValues>(() => {
    const base = defaultSpec();
    const model = initialGenerate?.model ?? base.model;
    return {
      materials: toMaterialItems(initialPlan?.materialUrls ?? []),
      content: initialPlan?.content ?? '',
      styleReferenceImages: toImageItems(initialGenerate?.styleReferenceUrl),
      characterModelImages: toImageItems(initialGenerate?.characterModelUrl),
      characterRequirement: initialGenerate?.characterRequirement ?? '',
      spec: {
        ...base,
        model,
        aspectRatio: initialGenerate?.aspectRatio ?? base.aspectRatio,
        clarity: resolveClarityForModel(model, initialGenerate?.clarity ?? base.clarity),
        quality: getModelCapability(model)?.qualityDefault ?? base.quality,
      },
    };
  });
  const [streamText, setStreamText] = useState(initialPlan?.streamText ?? '');
  const [body, setBody] = useState(initialPlan?.body ?? '');
  const [caption, setCaption] = useState(initialPlan?.caption ?? '');
  const watchedSpec = Form.useWatch('spec', panelForm);
  const spec = watchedSpec ?? panelInitialValues.spec;
  const [images, setImages] = useState<ImageTextGeneratedImage[]>(initialGenerate?.images ?? []);
  const [generating, setGenerating] = useState(false);
  const [navLoading, setNavLoading] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef(body);
  const captionRef = useRef(caption);
  const imagesRef = useRef(images);
  const streamTextRef = useRef(streamText);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  /** 内容整理失败：丢掉半截流，回到已落盘正文或空态。 */
  function restoreStreamAfterPlanFailure() {
    const fallback = bodyRef.current;
    streamTextRef.current = fallback;
    setStreamText(fallback);
    setPhase(fallback.trim() ? 'planned' : 'plan');
  }

  function applyMaterialUrls(urls: string[]) {
    const previous = (panelForm.getFieldValue('materials') ?? []) as StudioImageUploadItem[];
    const next = previous.map((item, index) => ({
      uid: item.uid,
      previewUrl: urls[index] ?? item.previewUrl,
    }));
    revokeReplacedLocalUploadItemUrls(previous, next);
    panelForm.setFieldValue('materials', next);
  }

  /** 落盘内容快照，并把素材换成任务资产地址。 */
  async function persistPlan(view: ImageTextView) {
    const values = panelForm.getFieldsValue(true) as ImageTextPanelValues;
    const materials = values.materials ?? [];
    const materialUrls = await Promise.all(
      materials.map((item) =>
        item.file ? readUploadItemAsDataUrl(item) : Promise.resolve(item.previewUrl),
      ),
    );
    const saved = await saveImageTextStep<ImageTextPlanSnapshot>(task.id, 'plan', {
      content: values.content?.trim() ?? '',
      materialUrls,
      body: bodyRef.current,
      caption: captionRef.current,
      cards: [],
      view,
      ...(streamTextRef.current ? { streamText: streamTextRef.current } : {}),
    });
    applyMaterialUrls(saved.materialUrls);
  }

  /** 落盘生成快照：规格、参考图与出图资产 URL。 */
  async function persistGenerate() {
    const values = panelForm.getFieldsValue(true) as ImageTextPanelValues;
    const currentSpec = values.spec ?? panelInitialValues.spec;
    const styleReferenceImages = values.styleReferenceImages ?? [];
    const characterModelImages = values.characterModelImages ?? [];
    const characterRequirement = values.characterRequirement?.trim() ?? '';
    const styleReferenceUrl = await toPersistableImageUrl(styleReferenceImages);
    const characterModelUrl = await toPersistableImageUrl(characterModelImages);
    const saved = await saveImageTextStep<ImageTextGenerateSnapshot>(task.id, 'generate', {
      model: currentSpec.model,
      aspectRatio: currentSpec.aspectRatio,
      clarity: currentSpec.clarity,
      images: imagesRef.current,
      ...(styleReferenceUrl ? { styleReferenceUrl } : {}),
      ...(characterModelUrl ? { characterModelUrl } : {}),
      ...(characterRequirement ? { characterRequirement } : {}),
    });
    const urls = new Map(saved.images.map((item) => [item.id, item.url]));
    setImages((current) =>
      current.map((item) => {
        const url = urls.get(item.id);
        return url ? { ...item, url } : item;
      }),
    );
    imagesRef.current = imagesRef.current.map((item) => {
      const url = urls.get(item.id);
      return url ? { ...item, url } : item;
    });
    if (saved.styleReferenceUrl || styleReferenceImages.length === 0) {
      applySingleImageUrl(panelForm, 'styleReferenceImages', saved.styleReferenceUrl);
    }
    if (saved.characterModelUrl || characterModelImages.length === 0) {
      applySingleImageUrl(panelForm, 'characterModelImages', saved.characterModelUrl);
    }
  }

  async function handlePlan() {
    if (!(await validateForm(panelForm))) return;
    const materials = (panelForm.getFieldValue('materials') ?? []) as StudioImageUploadItem[];
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('planning');
    streamTextRef.current = '';
    setStreamText('');
    const buffer = createRafTextBuffer((text) => {
      streamTextRef.current = text;
      setStreamText(text);
    });
    try {
      const materialDataUrls = await Promise.all(
        materials.map((item) => readUploadItemAsDataUrl(item)),
      );
      const content = String(panelForm.getFieldValue('content') ?? '').trim();
      const res = await fetch('/api/studio/image-text/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          materialDataUrls,
          ...(content ? { content } : {}),
        }),
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
        restoreStreamAfterPlanFailure();
        return;
      }
      const parsed = normalizeCardBody(buffer.getText());
      if (!parsed) {
        message.error(PLAN_PARSE_FAILED);
        restoreStreamAfterPlanFailure();
        return;
      }
      const nextCaption = parseCaptionFromBody(parsed) ?? '';
      bodyRef.current = parsed;
      captionRef.current = nextCaption;
      streamTextRef.current = parsed;
      setBody(parsed);
      setCaption(nextCaption);
      setStreamText(parsed);
      setPhase('planned');
      try {
        await persistPlan('plan');
      } catch (err) {
        console.error('[image-text-studio] persist plan', err);
        message.warning(PERSIST_FAILED);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[image-text-studio] plan', err);
      message.error(err instanceof Error && err.message ? err.message : PLAN_FAILED);
      restoreStreamAfterPlanFailure();
    } finally {
      buffer.dispose();
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  function saveBody(nextBody: string) {
    const normalized = normalizeCardBody(nextBody);
    if (!normalized) return;
    const nextCaption = parseCaptionFromBody(normalized) ?? '';
    bodyRef.current = normalized;
    captionRef.current = nextCaption;
    streamTextRef.current = normalized;
    setBody(normalized);
    setCaption(nextCaption);
    setStreamText(normalized);
    void persistPlan(phase === 'generate' || phase === 'preview' ? 'generate' : 'plan').catch(
      (err) => {
        console.error('[image-text-studio] persist body', err);
        message.warning(PERSIST_FAILED);
      },
    );
  }

  async function handleGenerate() {
    const prompt = stripCaptionFromBody(bodyRef.current);
    if (!prompt) {
      message.warning(MISSING_BODY_WARNING);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const imageId = crypto.randomUUID();
    const values = panelForm.getFieldsValue(true) as ImageTextPanelValues;
    const currentSpec = values.spec ?? panelInitialValues.spec;
    setGenerating(true);
    try {
      const styleReference = (values.styleReferenceImages ?? [])[0];
      const characterModel = (values.characterModelImages ?? [])[0];
      const characterRequirement = values.characterRequirement?.trim() ?? '';
      const styleReferenceDataUrl = styleReference
        ? await readUploadItemAsDataUrl(styleReference)
        : undefined;
      const characterModelDataUrl = characterModel
        ? await readUploadItemAsDataUrl(characterModel)
        : undefined;
      if (controller.signal.aborted) return;
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          kind: 'imageText',
          count: 1,
          model: currentSpec.model,
          aspectRatio: currentSpec.aspectRatio,
          quality:
            getModelCapability(currentSpec.model)?.qualityDefault ?? currentSpec.quality ?? 'high',
          clarity: resolveClarityForModel(currentSpec.model, currentSpec.clarity),
          prompt,
          ...(styleReferenceDataUrl ? { styleReferenceDataUrl } : {}),
          ...(characterModelDataUrl ? { characterModelDataUrl } : {}),
          ...(characterRequirement ? { characterRequirement } : {}),
          slotIds: [imageId],
        }),
      });
      await assertOkOrJsonFail(res);
      let nextUrl: string | undefined;
      await consumeGenerateNdjson(res, (event) => {
        if (event.slotId !== imageId) return;
        if (event.error) message.error(event.error);
        if (event.url) nextUrl = event.url;
      });
      if (controller.signal.aborted) return;
      if (!nextUrl) return;
      const created: ImageTextGeneratedImage = {
        id: imageId,
        cardId: DEFAULT_GENERATE_CARD_ID,
        cardTitle: titleFromBody(prompt) ?? DEFAULT_GENERATE_CARD_TITLE,
        aspectRatio: currentSpec.aspectRatio,
        url: nextUrl,
        selected: false,
        createdAt: new Date().toISOString(),
      };
      const nextImages = [...imagesRef.current, created];
      imagesRef.current = nextImages;
      setImages(nextImages);
      try {
        await persistGenerate();
      } catch (err) {
        console.error('[image-text-studio] persist generate', err);
        message.warning(PERSIST_FAILED);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) return;
      console.error('[image-text-studio] generate', err);
      message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
    } finally {
      setGenerating(false);
      if (abortRef.current === controller) abortRef.current = null;
    }
  }

  /** 用户确认后中断当前生图请求。 */
  function cancelGenerate() {
    abortRef.current?.abort();
  }

  function togglePreviewImage(imageId: string) {
    const next = imagesRef.current.map((item) =>
      item.id === imageId ? { ...item, selected: !item.selected } : item,
    );
    imagesRef.current = next;
    setImages(next);
    void persistGenerate().catch((err) => {
      console.error('[image-text-studio] persist selection', err);
      message.warning(PERSIST_FAILED);
    });
  }

  async function handleNext() {
    if (phase === 'planning' || phase === 'plan') return;
    setNavLoading(true);
    try {
      if (phase === 'planned') {
        if (!bodyRef.current.trim()) {
          message.warning(MISSING_BODY_WARNING);
          return;
        }
        await persistPlan('generate');
        setPhase('generate');
        return;
      }
      if (phase === 'generate') {
        if (!imagesRef.current.some((item) => item.selected)) {
          message.warning(MISSING_PREVIEW_WARNING);
          return;
        }
        await persistPlan('preview');
        await persistGenerate();
        setPhase('preview');
      }
    } catch (err) {
      console.error('[image-text-studio] next', err);
      message.warning(PERSIST_FAILED);
    } finally {
      setNavLoading(false);
    }
  }

  async function handlePrev() {
    const view: ImageTextView = phase === 'preview' ? 'generate' : 'plan';
    setNavLoading(true);
    try {
      if (phase === 'generate') await persistGenerate();
      await persistPlan(view);
      setPhase(view === 'generate' ? 'generate' : bodyRef.current.trim() ? 'planned' : 'plan');
    } catch (err) {
      console.error('[image-text-studio] prev', err);
      message.warning(PERSIST_FAILED);
      setPhase(view === 'generate' ? 'generate' : bodyRef.current.trim() ? 'planned' : 'plan');
    } finally {
      setNavLoading(false);
    }
  }

  return {
    panelForm,
    panelInitialValues,
    phase,
    streamText,
    body,
    caption,
    spec,
    images,
    generating,
    navLoading,
    handlePlan,
    saveBody,
    handleGenerate,
    cancelGenerate,
    togglePreviewImage,
    handleNext,
    handlePrev,
  };
}
