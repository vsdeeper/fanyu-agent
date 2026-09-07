'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Layout, Steps, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { EcommerceTaskDetail } from '@/app/api/studio/ecommerce/_shared/task-types';
import type { MainImagePlanCard } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import { ECOMMERCE_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import {
  ANALYZE_FAILED,
  ANALYSIS_MISSING,
  ANALYSIS_UPLOAD_MISSING,
  DESIGN_RESULT_MISSING,
  DEFAULT_DESIGN_FORM_STATE,
  DEFAULT_FORM_STATE,
  GENERATE_FAILED,
  MAIN_IMAGE_RESULT_MISSING,
  MAX_MODEL_IMAGES,
  NO_IMAGE_WARNING,
  POSTER_RESULT_MISSING,
  THEME_SELECT_MISSING,
  VISUAL_SELECT_MISSING,
} from './constants';
import ResultPanel from './ResultPanel';
import type {
  AnalysisStepSnapshot,
  DesignFormState,
  DesignResultGroups,
  DesignStepSnapshot,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioResultImage,
  VisualStepSnapshot,
} from './types';
import {
  appendProductDocs,
  appendProductImages,
  appendPendingDesignImages,
  appendPendingMainImageImages,
  applyDesignGenerateEvent,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  consumeGenerateNdjson,
  createAnalysisStepSnapshot,
  createDesignStepSnapshot,
  createVisualStepSnapshot,
  deleteStudioStep,
  createRafTextBuffer,
  isAbortError,
  isSameStepSnapshot,
  resolveInitialStudioPhase,
  getSelectedResultImageUrl,
  pendingImagesFromCount,
  phaseAfterNext,
  phaseAfterPrev,
  removeProductDoc,
  removeProductImage,
  readAnalysisStepSnapshot,
  readDesignStepSnapshot,
  readUrlAsDataUrl,
  readVisualStepSnapshot,
  revokeProductDocUrls,
  revokeProductImageUrls,
  saveStudioStep,
  toAnalyzePayload,
  toAnalyzeImages,
  toDesignGeneratePayload,
  toMainImageAnalyzePayload,
  toMainImageGeneratePayload,
  toVisualGeneratePayload,
} from './utils';
import { parseMainImagePlan } from './_utils/parse-main-image-plan';
import {
  getWorkflowStepIndex,
  isMainImageTask,
  isPosterTask,
  resolveEcommerceWorkflow,
} from './workflow';
import styles from './EcommerceStudio.module.css';

/**
 * 电商设计工作台：左侧参数，右侧流式规划与出图。
 */
type EcommerceStudioProps = {
  task: EcommerceTaskDetail;
};

export default function EcommerceStudio({ task }: EcommerceStudioProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const poster = isPosterTask(task.taskType);
  const mainImage = isMainImageTask(task.taskType);
  const initialAnalysis = readAnalysisStepSnapshot(task.steps.analysis?.data);
  const initialVisual = mainImage ? undefined : readVisualStepSnapshot(task.steps.visual?.data);
  const initialDesign = readDesignStepSnapshot(task.steps.design?.data);
  const [images, setImages] = useState<ProductImageItem[]>(
    mainImage
      ? (initialDesign?.images ?? [])
      : poster
        ? (initialVisual?.images ?? [])
        : (initialAnalysis?.images ?? []),
  );
  const [documents, setDocuments] = useState<ProductDocItem[]>(
    mainImage
      ? (initialAnalysis?.documents ?? initialDesign?.documents ?? [])
      : poster
        ? (initialVisual?.documents ?? [])
        : (initialAnalysis?.documents ?? []),
  );
  const [form, setForm] = useState<StudioFormState>(initialVisual?.form ?? DEFAULT_FORM_STATE);
  const [designForm, setDesignForm] = useState<DesignFormState>(() => {
    const base = initialDesign?.form ?? {
      ...DEFAULT_DESIGN_FORM_STATE,
      taskType: task.taskType,
    };
    if (mainImage) return { ...base, taskType: '主图' };
    return poster ? { ...base, taskType: '营销海报' } : base;
  });
  const [modelImages, setModelImages] = useState<ProductImageItem[]>(
    initialDesign?.modelImages ?? [],
  );
  const [phase, setPhase] = useState<StudioPhase>(
    resolveInitialStudioPhase(initialAnalysis, poster, mainImage, Boolean(initialDesign)),
  );
  const [analysisText, setAnalysisText] = useState(
    mainImage
      ? (initialAnalysis?.analysisText ?? '')
      : poster
        ? (initialVisual?.analysisText ?? '')
        : (initialAnalysis?.analysisText ?? ''),
  );
  const initialParsedPlan = mainImage
    ? parseMainImagePlan(initialAnalysis?.analysisText ?? '')
    : { visualLock: '', cards: [] };
  const [visualLock, setVisualLock] = useState(
    initialAnalysis?.visualLock ?? initialParsedPlan.visualLock,
  );
  const [planCards, setPlanCards] = useState<MainImagePlanCard[]>(
    initialAnalysis?.planCards?.length ? initialAnalysis.planCards : initialParsedPlan.cards,
  );
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>(
    initialAnalysis?.selectedThemeIds ?? [],
  );
  const [visualImages, setVisualImages] = useState<StudioResultImage[]>(
    mainImage ? [] : (initialVisual?.visualImages ?? []),
  );
  const [designResultGroups, setDesignResultGroups] = useState<DesignResultGroups>(
    initialDesign?.designResultGroups ?? {},
  );
  const [selectedVisualIndex, setSelectedVisualIndex] = useState<number | null>(
    mainImage ? null : (initialVisual?.selectedVisualIndex ?? null),
  );
  const [nextLoading, setNextLoading] = useState(false);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const modelImagesRef = useRef(modelImages);
  const abortRef = useRef<AbortController | null>(null);
  // 标记本会话是否重跑过分析：仅此时提交才使旧下游视觉/设计失效，避免「打开已有任务直接下一步」误删
  const analysisDirtyRef = useRef(false);
  const lastSnapshotsRef = useRef<{
    analysis: AnalysisStepSnapshot | undefined;
    visual: VisualStepSnapshot | undefined;
    design: DesignStepSnapshot | undefined;
  }>({
    analysis: initialAnalysis,
    visual: initialVisual,
    design: initialDesign,
  });

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    modelImagesRef.current = modelImages;
  }, [modelImages]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
      revokeProductImageUrls(modelImagesRef.current);
      revokeProductDocUrls(documentsRef.current);
    };
  }, [analysisBuffer]);

  const formLocked =
    phase === 'analyzing' || phase === 'visualGenerating' || phase === 'designGenerating';
  const analysisStreaming = phase === 'analyzing';
  const expectedVisualCount = Number.parseInt(form.count, 10) || 1;
  const expectedDesignCount = Number.parseInt(designForm.count, 10) || 1;
  const workflow = resolveEcommerceWorkflow(task.taskType);

  const abortCurrent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    analysisBuffer.dispose();
  }, [analysisBuffer]);

  // 落盘与下一步/完成共用同一份动作：把当前步左栏 + 右栏整体快照入库（data: URL 由服务端转资产 URL）
  // 注：详情图分析变更后，下游 visual/design 在 handleNext 时删除；主图保留已出主图。生成完成即落库不误删已提交结果
  const persistAnalysisStep = useCallback(
    async (
      imgs: ProductImageItem[],
      docs: ProductDocItem[],
      text: string,
      extras?: {
        visualLock?: string;
        planCards?: MainImagePlanCard[];
        selectedThemeIds?: string[];
      },
    ) => {
      const next = await createAnalysisStepSnapshot(
        mainImage ? [] : imgs,
        docs,
        text,
        mainImage
          ? {
              visualLock: extras?.visualLock ?? visualLock,
              planCards: extras?.planCards ?? planCards,
              selectedThemeIds: extras?.selectedThemeIds ?? selectedThemeIds,
            }
          : undefined,
      );
      if (isSameStepSnapshot(next, lastSnapshotsRef.current.analysis)) return;
      const saved = await saveStudioStep(task.id, 'analysis', next);
      lastSnapshotsRef.current.analysis = saved;
      if (!mainImage) setImages(saved.images);
      setDocuments(saved.documents);
      setAnalysisText(saved.analysisText);
      if (typeof saved.visualLock === 'string') setVisualLock(saved.visualLock);
      if (saved.planCards) setPlanCards(saved.planCards);
      if (saved.selectedThemeIds) setSelectedThemeIds(saved.selectedThemeIds);
    },
    [
      mainImage,
      planCards,
      selectedThemeIds,
      task.id,
      visualLock,
      setImages,
      setDocuments,
      setAnalysisText,
    ],
  );

  const persistVisualStep = useCallback(
    async (f: StudioFormState, imgs: StudioResultImage[], idx: number | null) => {
      const next = await createVisualStepSnapshot(
        f,
        imgs,
        idx,
        imagesRef.current,
        documentsRef.current,
        analysisText,
      );
      if (isSameStepSnapshot(next, lastSnapshotsRef.current.visual)) return;
      const saved = await saveStudioStep(task.id, 'visual', next);
      lastSnapshotsRef.current.visual = saved;
      setForm(saved.form);
      setVisualImages(saved.visualImages);
      if (saved.images) setImages(saved.images);
      if (saved.documents) setDocuments(saved.documents);
      if (typeof saved.analysisText === 'string') setAnalysisText(saved.analysisText);
    },
    [analysisText, task.id, setForm, setVisualImages, setImages, setDocuments, setAnalysisText],
  );

  const persistDesignStep = useCallback(
    async (df: DesignFormState, groups: DesignResultGroups, modelImgs: ProductImageItem[]) => {
      const next = await createDesignStepSnapshot(
        df,
        groups,
        modelImgs,
        mainImage
          ? {
              images: imagesRef.current,
            }
          : undefined,
      );
      if (isSameStepSnapshot(next, lastSnapshotsRef.current.design)) return;
      const saved = await saveStudioStep(task.id, 'design', next);
      lastSnapshotsRef.current.design = saved;
      setDesignForm(saved.form);
      setDesignResultGroups(saved.designResultGroups);
      setModelImages(saved.modelImages);
      if (saved.images) setImages(saved.images);
      if (saved.documents) setDocuments(saved.documents);
      if (typeof saved.analysisText === 'string' && !mainImage) setAnalysisText(saved.analysisText);
    },
    [
      mainImage,
      task.id,
      setDesignForm,
      setDesignResultGroups,
      setModelImages,
      setImages,
      setDocuments,
      setAnalysisText,
    ],
  );

  const streamedPlan = mainImage && phase === 'analyzing' ? parseMainImagePlan(analysisText) : null;
  const displayVisualLock = streamedPlan ? streamedPlan.visualLock : visualLock;
  const displayPlanCards = streamedPlan ? streamedPlan.cards : planCards;

  const handleAnalyze = useCallback(async () => {
    if (mainImage) {
      if (documents.length === 0) {
        message.warning(ANALYSIS_UPLOAD_MISSING);
        return;
      }
    } else if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    analysisBuffer.reset();
    if (mainImage) {
      setVisualLock('');
      setPlanCards([]);
      setSelectedThemeIds([]);
    } else {
      setVisualImages([]);
      setDesignResultGroups({});
      setSelectedVisualIndex(null);
    }
    try {
      const payload = mainImage
        ? await toMainImageAnalyzePayload(documents)
        : await toAnalyzePayload(images, documents);
      const res = await fetch(
        mainImage ? '/api/studio/ecommerce/analyze' : '/api/studio/business-analysis/analyze',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        },
      );
      await assertOkOrJsonFail(res);
      let receivedDone = false;
      await consumeAnalyzeSse(res, {
        onText: (delta) => {
          analysisBuffer.append(delta);
        },
        onDone: () => {
          receivedDone = true;
        },
        onError: (text) => {
          message.error(text);
        },
      });
      analysisBuffer.flushNow();
      if (controller.signal.aborted) {
        // 用户中止（通常来自上一步）：相位由发起方 handlePrev 管理，勿在此覆盖
        return;
      }
      if (receivedDone) {
        const text = analysisBuffer.getText();
        if (mainImage) {
          const parsed = parseMainImagePlan(text);
          setVisualLock(parsed.visualLock);
          setPlanCards(parsed.cards);
          analysisDirtyRef.current = true;
          setPhase('analyzed');
          try {
            await persistAnalysisStep(images, documents, text, {
              visualLock: parsed.visualLock,
              planCards: parsed.cards,
              selectedThemeIds: [],
            });
          } catch (err) {
            console.error('[ecommerce-studio] persist analysis', err);
          }
          return;
        }
        revokeProductImageUrls(modelImagesRef.current);
        setModelImages([]);
        analysisDirtyRef.current = true;
        setPhase('analyzed');
        try {
          await persistAnalysisStep(images, documents, text);
        } catch (err) {
          console.error('[ecommerce-studio] persist analysis', err);
        }
        return;
      }
      setPhase('input');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        return;
      }
      console.error('[ecommerce-studio] analyze', err);
      message.error(err instanceof Error && err.message ? err.message : ANALYZE_FAILED);
      setPhase('input');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    abortCurrent,
    analysisBuffer,
    documents,
    images,
    mainImage,
    message,
    persistAnalysisStep,
    setModelImages,
    setPhase,
  ]);

  const handleGenerateVisual = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    if (!analysisText.trim()) {
      message.warning(ANALYSIS_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const count = Number.parseInt(form.count, 10) || 1;
    const batchStartIndex = visualImages.length;
    let nextVisualImages = [
      ...visualImages,
      ...pendingImagesFromCount(count, batchStartIndex, form.aspectRatio),
    ];
    setPhase('visualGenerating');
    setVisualImages(nextVisualImages);
    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toVisualGeneratePayload(form, analysisText, images)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        nextVisualImages = applyGenerateEvent(nextVisualImages, event, batchStartIndex);
        setVisualImages(nextVisualImages);
      });
      if (controller.signal.aborted) {
        // 用户中止（通常来自上一步）：恢复本批前的视觉结果，相位由发起方 handlePrev 管理
        setVisualImages(visualImages);
        return;
      }
      // 生成产出右侧栏结果；生成完成即落库（与下一步/完成同一动作）
      setPhase('visual');
      try {
        await persistVisualStep(form, nextVisualImages, selectedVisualIndex);
      } catch (err) {
        console.error('[ecommerce-studio] persist visual', err);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setVisualImages(visualImages);
        return;
      }
      console.error('[ecommerce-studio] generate visual', err);
      message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      setPhase('visual');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    abortCurrent,
    analysisText,
    form,
    images,
    message,
    persistVisualStep,
    selectedVisualIndex,
    setPhase,
    visualImages,
  ]);

  const handleGenerateDesign = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    const selectedCards = planCards.filter((card) => selectedThemeIds.includes(card.themeId));
    if (mainImage) {
      if (!visualLock.trim() || selectedCards.length === 0) {
        message.warning(THEME_SELECT_MISSING);
        return;
      }
    } else if (!analysisText.trim()) {
      message.warning(ANALYSIS_MISSING);
      return;
    }
    const nextDesignForm = poster
      ? { ...designForm, taskType: '营销海报' as const }
      : mainImage
        ? { ...designForm, taskType: '主图' as const }
        : designForm;
    let visualDataUrl = '';
    if (!mainImage) {
      const selected = getSelectedResultImageUrl(visualImages, selectedVisualIndex);
      if (!selected) {
        message.warning(VISUAL_SELECT_MISSING);
        return;
      }
      visualDataUrl = selected;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const taskType = nextDesignForm.taskType;
    const batchStartIndex = designResultGroups[taskType]?.length ?? 0;
    const perCardCount = Number.parseInt(nextDesignForm.count, 10) || 1;
    let nextDesignResultGroups = mainImage
      ? appendPendingMainImageImages(
          designResultGroups,
          selectedCards,
          perCardCount,
          nextDesignForm.aspectRatio,
        )
      : appendPendingDesignImages(
          designResultGroups,
          taskType,
          expectedDesignCount,
          nextDesignForm.aspectRatio,
        );
    setPhase('designGenerating');
    setDesignResultGroups(nextDesignResultGroups);
    try {
      const body = mainImage
        ? await toMainImageGeneratePayload(nextDesignForm, visualLock, selectedCards, images)
        : await toDesignGeneratePayload(
            nextDesignForm,
            analysisText,
            images,
            await readUrlAsDataUrl(visualDataUrl),
            await toAnalyzeImages(modelImages),
          );
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        nextDesignResultGroups = applyDesignGenerateEvent(
          nextDesignResultGroups,
          taskType,
          event,
          batchStartIndex,
        );
        setDesignResultGroups(nextDesignResultGroups);
      });
      if (controller.signal.aborted) {
        // 用户中止（通常来自上一步）：恢复本批前的设计结果，相位由发起方 handlePrev 管理
        setDesignResultGroups(designResultGroups);
        return;
      }
      setDesignForm(nextDesignForm);
      setPhase('design');
      try {
        await persistDesignStep(nextDesignForm, nextDesignResultGroups, modelImages);
      } catch (err) {
        console.error('[ecommerce-studio] persist design', err);
      }
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setDesignResultGroups(designResultGroups);
        return;
      }
      console.error('[ecommerce-studio] generate design', err);
      message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      setPhase('design');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    abortCurrent,
    analysisText,
    designForm,
    designResultGroups,
    expectedDesignCount,
    images,
    mainImage,
    message,
    modelImages,
    persistDesignStep,
    planCards,
    poster,
    selectedThemeIds,
    selectedVisualIndex,
    setDesignForm,
    setPhase,
    visualImages,
    visualLock,
  ]);

  const handleImagesAppend = useCallback(
    (files: File[]) => {
      setImages((current) => appendProductImages(current, files));
    },
    [setImages],
  );

  const handleImageRemove = useCallback(
    (uid: string) => {
      setImages((current) => removeProductImage(current, uid));
    },
    [setImages],
  );

  const handleDocsAppend = useCallback(
    (files: File[]) => {
      const singleDoc = poster || mainImage;
      setDocuments((current) => appendProductDocs(current, files, singleDoc ? 1 : undefined));
      if (poster && files[0]) {
        void files[0].text().then((text) => setAnalysisText(text));
      }
    },
    [mainImage, poster, setDocuments, setAnalysisText],
  );

  const handleDocRemove = useCallback(
    (uid: string) => {
      setDocuments((current) => removeProductDoc(current, uid));
      if (poster) setAnalysisText('');
    },
    [poster, setDocuments, setAnalysisText],
  );

  const handleModelImagesAppend = useCallback(
    (files: File[]) => {
      setModelImages((current) => appendProductImages(current, files, MAX_MODEL_IMAGES));
    },
    [setModelImages],
  );

  const handleModelImageRemove = useCallback(
    (uid: string) => {
      setModelImages((current) => removeProductImage(current, uid));
    },
    [setModelImages],
  );

  const handleSelectVisual = useCallback((index: number) => {
    // 点选视觉图仅更新交互态，落库收敛到下一步/完成
    setSelectedVisualIndex(index);
  }, []);

  const handlePrev = useCallback(() => {
    // 以进行中请求为准中止，避免相位与 abortRef 短暂不一致时漏 abort
    if (abortRef.current) abortCurrent();
    setPhase((current) => phaseAfterPrev(current, poster, mainImage));
  }, [abortCurrent, mainImage, poster, setPhase]);

  const handleNext = useCallback(async () => {
    if (phase === 'visual' && selectedVisualIndex === null) {
      message.warning(VISUAL_SELECT_MISSING);
      return;
    }
    if (
      phase === 'design' &&
      !Object.values(designResultGroups).some((group) =>
        group?.some((image) => image.status === 'ready' && Boolean(image.url)),
      )
    ) {
      message.warning(
        isMainImageTask(task.taskType)
          ? MAIN_IMAGE_RESULT_MISSING
          : isPosterTask(task.taskType)
            ? POSTER_RESULT_MISSING
            : DESIGN_RESULT_MISSING,
      );
      return;
    }
    // 下一步/完成：左右栏有变化才落库；PUT 或下游删除失败不跳步
    setNextLoading(true);
    try {
      if (phase === 'analyzed') {
        await persistAnalysisStep(
          images,
          documents,
          analysisText,
          mainImage ? { selectedThemeIds } : undefined,
        );
        if (analysisDirtyRef.current) {
          if (!mainImage) {
            await Promise.all([
              deleteStudioStep(task.id, 'visual'),
              deleteStudioStep(task.id, 'design'),
            ]);
            lastSnapshotsRef.current.visual = undefined;
            lastSnapshotsRef.current.design = undefined;
          }
          analysisDirtyRef.current = false;
        }
      } else if (phase === 'visual') {
        await persistVisualStep(form, visualImages, selectedVisualIndex);
      } else if (phase === 'design') {
        await persistDesignStep(designForm, designResultGroups, modelImages);
      }
      setPhase((current) => phaseAfterNext(current, mainImage));
    } catch (err) {
      console.error('[ecommerce-studio] persist step on next', err);
    } finally {
      setNextLoading(false);
    }
  }, [
    analysisText,
    designForm,
    designResultGroups,
    documents,
    form,
    images,
    mainImage,
    message,
    modelImages,
    persistAnalysisStep,
    persistDesignStep,
    persistVisualStep,
    phase,
    selectedThemeIds,
    selectedVisualIndex,
    setNextLoading,
    setPhase,
    task.id,
    task.taskType,
    visualImages,
  ]);

  const selectedCards = planCards.filter((card) => selectedThemeIds.includes(card.themeId));

  const handleToggleTheme = useCallback((themeId: string) => {
    setSelectedThemeIds((current) =>
      current.includes(themeId) ? current.filter((id) => id !== themeId) : [...current, themeId],
    );
  }, []);

  const handleVisualLockSave = useCallback(
    (next: string) => {
      setVisualLock(next);
      void persistAnalysisStep(images, documents, analysisText, {
        visualLock: next,
        planCards,
        selectedThemeIds,
      });
    },
    [analysisText, documents, images, persistAnalysisStep, planCards, selectedThemeIds],
  );

  const handlePlanCardSave = useCallback(
    (themeId: string, requirement: string) => {
      const nextCards = planCards.map((card) =>
        card.themeId === themeId ? { ...card, requirement } : card,
      );
      setPlanCards(nextCards);
      void persistAnalysisStep(images, documents, analysisText, {
        visualLock,
        planCards: nextCards,
        selectedThemeIds,
      });
    },
    [analysisText, documents, images, persistAnalysisStep, planCards, selectedThemeIds, visualLock],
  );

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          aria-label="返回电商设计任务列表"
          onClick={() => router.push(ECOMMERCE_PATH)}
        />
        <div className={styles.brand}>
          <Typography.Title level={5} className={styles.title} ellipsis>
            {task.name}
          </Typography.Title>
          <Tag className={styles.typeTag}>{task.taskType}</Tag>
        </div>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <div className={styles.stepsRow}>
        <Steps
          className={styles.steps}
          current={getWorkflowStepIndex(workflow, phase)}
          size="small"
          items={workflow}
        />
      </div>
      <Layout.Content className={styles.content}>
        <div className={styles.workspace}>
          {phase === 'complete' ? (
            <CompletionPanel
              analysisText={analysisText}
              visualImages={visualImages}
              designResultGroups={designResultGroups}
              showDesignTitles={!mainImage}
              groupByTheme={mainImage}
              onPrev={handlePrev}
            />
          ) : (
            <>
              <ControlPanel
                taskType={task.taskType}
                images={images}
                documents={documents}
                modelImages={modelImages}
                form={form}
                designForm={designForm}
                phase={phase}
                formLocked={formLocked}
                canGenerateVisual={images.length > 0 && Boolean(analysisText.trim())}
                canGenerateDesign={
                  mainImage
                    ? images.length > 0 && selectedCards.length > 0 && Boolean(visualLock.trim())
                    : true
                }
                selectedCards={selectedCards}
                onImagesAppend={handleImagesAppend}
                onImageRemove={handleImageRemove}
                onDocsAppend={handleDocsAppend}
                onDocRemove={handleDocRemove}
                onModelImagesAppend={handleModelImagesAppend}
                onModelImageRemove={handleModelImageRemove}
                onFormChange={setForm}
                onDesignFormChange={setDesignForm}
                onAnalyze={handleAnalyze}
                onGenerateVisual={handleGenerateVisual}
                onGenerateDesign={handleGenerateDesign}
              />
              <ResultPanel
                taskType={task.taskType}
                phase={phase}
                analysisText={analysisText}
                analysisStreaming={analysisStreaming}
                visualImages={visualImages}
                designResultGroups={designResultGroups}
                expectedVisualCount={expectedVisualCount}
                selectedVisualIndex={selectedVisualIndex}
                nextLoading={nextLoading}
                isPoster={poster}
                visualLock={displayVisualLock}
                planCards={displayPlanCards}
                selectedThemeIds={selectedThemeIds}
                onSelectVisual={handleSelectVisual}
                onPrev={handlePrev}
                onNext={handleNext}
                onAnalysisTextChange={setAnalysisText}
                onToggleTheme={handleToggleTheme}
                onVisualLockSave={handleVisualLockSave}
                onPlanCardSave={handlePlanCardSave}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
