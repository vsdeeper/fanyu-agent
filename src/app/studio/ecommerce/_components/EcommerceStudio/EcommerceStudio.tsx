'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Layout, Steps, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type {
  EcommerceStepKey,
  EcommerceTaskDetail,
  EcommerceTaskType,
} from '@/app/api/studio/ecommerce/_shared/task-types';
import type { StudioJobSnapshot } from '@/app/api/studio/_shared/job-types';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { RewriteCardResult } from '@/app/api/studio/ecommerce/_shared/rewrite-card';
import { useStudioJob } from '@/app/studio/_hooks/useStudioJob';
import { ECOMMERCE_PATH } from '@/components/AppLayout/constants';
import { apiPost } from '@/lib/shared/client/api-client';
import ModeSwitch from '@/components/ModeSwitch';
import CompletionPanel from './CompletionPanel';
import { toggleExportSelectedIdByTheme } from './CompletionPanel/utils';
import ControlPanel from './ControlPanel';
import {
  ANALYZE_FAILED,
  ANALYSIS_MISSING,
  ANALYSIS_SOURCE_MISSING,
  ANALYSIS_UPLOAD_MISSING,
  DESIGN_RESULT_MISSING,
  DEFAULT_FORM_STATE,
  DETAIL_IMAGE_RESULT_MISSING,
  ECOMMERCE_API_BASE,
  GENERATE_FAILED,
  MAIN_IMAGE_RESULT_MISSING,
  MAX_BRAND_LOGOS,
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
  appendPendingThemeImages,
  applyDesignGenerateEvent,
  applyGenerateEvent,
  assertOkOrJsonFail,
  canStartThemePlan,
  consumeAnalyzeSse,
  createAnalysisStepSnapshot,
  createDefaultDesignForm,
  createDesignStepSnapshot,
  createVisualStepSnapshot,
  createRafTextBuffer,
  isAbortError,
  isSameStepSnapshot,
  resolveInitialStudioPhase,
  getSelectedResultImageUrl,
  getGeneratedDesignGroups,
  getGeneratedImages,
  pendingImagesFromCount,
  phaseAfterNext,
  phaseAfterPrev,
  removeProductDoc,
  removeProductImage,
  readAnalysisStepSnapshot,
  readBrandLogoDataUrl,
  readDesignStepSnapshot,
  readProductDocsAsText,
  readUrlAsDataUrl,
  readVisualStepSnapshot,
  revokeProductDocUrls,
  revokeProductImageUrls,
  saveStudioStep,
  toAnalyzeImages,
  toDesignGeneratePayload,
  toDetailImageGeneratePayload,
  toThemeAnalyzePayload,
  toMainImageGeneratePayload,
  toVisualGeneratePayload,
} from './utils';
import { parseDetailImagePlan } from './_utils/parse-detail-image-plan';
import { parseMainImagePlan } from './_utils/parse-main-image-plan';
import {
  jobGeneratingPhase,
  mergeBatchGroups,
  mergeBatchImages,
  restoreBatchImages,
  shouldAdvancePhase,
  syncJobGroupSlots,
  syncJobSlots,
} from './_utils/job-restore';
import {
  getWorkflowStepIndex,
  isDetailImageTask,
  isMainImageTask,
  isPosterTask,
  isThemePlanTask,
  resolveEcommerceWorkflow,
} from './workflow';
import styles from './EcommerceStudio.module.css';

/**
 * 电商设计工作台：左侧参数，右侧规划与出图。
 * 分析走 SSE（离开页面会中断），两步出图走后台作业（离开页面照常跑完）。
 */
type EcommerceStudioProps = {
  task: EcommerceTaskDetail;
  /** 首屏已存在的后台生图作业，用于重新进入任务时接上进度 */
  initialJob?: StudioJobSnapshot | null;
};

export default function EcommerceStudio({ task, initialJob = null }: EcommerceStudioProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const poster = isPosterTask(task.taskType);
  const mainImage = isMainImageTask(task.taskType);
  const detailImage = isDetailImageTask(task.taskType);
  const themePlan = isThemePlanTask(task.taskType);
  const initialAnalysis = readAnalysisStepSnapshot(task.steps.analysis?.data);
  const initialVisual = themePlan ? undefined : readVisualStepSnapshot(task.steps.visual?.data);
  const initialDesign = readDesignStepSnapshot(task.steps.design?.data);

  // 首屏带回的作业有两种：仍在跑（接着看进度），或离开期间已结束（补一次结算落库）。
  // 两者都要把结果并进初始 state，且必须在 useState 初始化时完成 —— 否则会先渲染旧状态再跳一次，出现闪烁。
  const restoredJob = initialJob;
  const restoredBatch = restoredJob ? restoreBatchImages(restoredJob) : [];
  /** 挂载时该作业已终态：只补结算，不把相位推到结果步（保持「再次进入停在第一步」的既有行为） */
  const settledAtMountJobId =
    restoredJob && restoredJob.status !== 'running' ? restoredJob.id : null;
  const restoredDesignTaskType = (restoredJob?.data.pending.taskType ??
    task.taskType) as EcommerceTaskType;
  // 作业回显的表单即该步生成时使用的表单，恢复与结算都以它为准
  const restoredVisualForm =
    restoredJob?.stepKey === 'visual' ? (restoredJob.data.pending.form as StudioFormState) : null;
  const restoredDesignForm =
    restoredJob?.stepKey === 'design' ? (restoredJob.data.pending.form as DesignFormState) : null;
  const {
    job,
    running: jobRunning,
    cancelling: jobCancelling,
    start: startJob,
    cancel: cancelJob,
    release: releaseJob,
  } = useStudioJob({ apiBase: ECOMMERCE_API_BASE, taskId: task.id, initialJob });
  const [images, setImages] = useState<ProductImageItem[]>(
    themePlan
      ? (initialDesign?.images ?? [])
      : poster
        ? (initialVisual?.images ?? [])
        : (initialAnalysis?.images ?? []),
  );
  const [documents, setDocuments] = useState<ProductDocItem[]>(
    themePlan
      ? (initialAnalysis?.documents ?? initialDesign?.documents ?? [])
      : poster
        ? (initialVisual?.documents ?? [])
        : (initialAnalysis?.documents ?? []),
  );
  // 主图 / 详情图任务共用的补充产品资料；documents 恒为商业分析，两组不可混用
  const [productDocs, setProductDocs] = useState<ProductDocItem[]>(
    initialAnalysis?.productDocs ?? [],
  );
  // 品牌 Logo 与主图说明都只服务主图任务，且都在分析步录入、出图步复用
  const [brandLogo, setBrandLogo] = useState<ProductImageItem[]>(
    initialAnalysis?.brandLogoImages ?? [],
  );
  const [mainImageDescription, setMainImageRequirement] = useState(
    initialAnalysis?.mainImageDescription ?? '',
  );
  const [form, setForm] = useState<StudioFormState>(
    restoredVisualForm ?? initialVisual?.form ?? DEFAULT_FORM_STATE,
  );
  const [designForm, setDesignForm] = useState<DesignFormState>(() => {
    const base =
      restoredDesignForm ?? initialDesign?.form ?? createDefaultDesignForm(task.taskType);
    if (mainImage) return { ...base, taskType: '主图' };
    if (detailImage) return { ...base, taskType: '详情图', aspectRatio: base.aspectRatio || '3:4' };
    return poster ? { ...base, taskType: '营销海报' } : base;
  });
  const [modelImages, setModelImages] = useState<ProductImageItem[]>(
    initialDesign?.modelImages ?? [],
  );
  const [phase, setPhase] = useState<StudioPhase>(() => {
    const restoredPhase =
      restoredJob?.status === 'running' ? jobGeneratingPhase(restoredJob.stepKey) : null;
    return (
      restoredPhase ??
      resolveInitialStudioPhase(initialAnalysis, poster, themePlan, Boolean(initialDesign))
    );
  });
  const [analysisText, setAnalysisText] = useState(
    themePlan
      ? (initialAnalysis?.analysisText ?? '')
      : poster
        ? (initialVisual?.analysisText ?? '')
        : (initialAnalysis?.analysisText ?? ''),
  );
  const initialParsedPlan = themePlan
    ? (detailImage ? parseDetailImagePlan : parseMainImagePlan)(initialAnalysis?.analysisText ?? '')
    : { cards: [] };
  const [planCards, setPlanCards] = useState<ThemePlanCard[]>(
    initialAnalysis?.planCards?.length ? initialAnalysis.planCards : initialParsedPlan.cards,
  );
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>(
    initialAnalysis?.selectedThemeIds ?? [],
  );
  const [visualImages, setVisualImages] = useState<StudioResultImage[]>(() => {
    const base = themePlan ? [] : (initialVisual?.visualImages ?? []);
    return restoredJob?.stepKey === 'visual' && restoredBatch.length > 0
      ? mergeBatchImages(base, restoredBatch)
      : base;
  });
  const [designResultGroups, setDesignResultGroups] = useState<DesignResultGroups>(() => {
    const base = initialDesign?.designResultGroups ?? {};
    return restoredJob?.stepKey === 'design' && restoredBatch.length > 0
      ? mergeBatchGroups(base, restoredDesignTaskType, restoredBatch)
      : base;
  });
  const [selectedVisualId, setSelectedVisualId] = useState<string | null>(
    themePlan ? null : (initialVisual?.selectedVisualId ?? null),
  );
  const [referenceImageId, setReferenceImageId] = useState<string | null>(
    initialDesign?.referenceImageId ?? null,
  );
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>(
    initialDesign?.selectedExportIds ?? [],
  );
  const [nextLoading, setNextLoading] = useState(false);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const productDocsRef = useRef(productDocs);
  const brandLogoRef = useRef(brandLogo);
  const mainImageDescriptionRef = useRef(mainImageDescription);
  const modelImagesRef = useRef(modelImages);
  const abortRef = useRef<AbortController | null>(null);
  /** 当前作业所属的流程步骤；null 表示本会话没在追踪作业 */
  const trackedStepRef = useRef<EcommerceStepKey | null>(
    (restoredJob?.stepKey as EcommerceStepKey | undefined) ?? null,
  );
  /** 已套用到界面的事件条数，用于增量消费作业进度 */
  const appliedEventCountRef = useRef(restoredJob?.data.events.length ?? 0);
  /** 已结算的作业 id，避免同一个终态作业被重复落库 */
  const settledJobIdRef = useRef<string | null>(null);
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
    productDocsRef.current = productDocs;
  }, [productDocs]);

  useEffect(() => {
    brandLogoRef.current = brandLogo;
  }, [brandLogo]);

  useEffect(() => {
    mainImageDescriptionRef.current = mainImageDescription;
  }, [mainImageDescription]);

  useEffect(() => {
    modelImagesRef.current = modelImages;
  }, [modelImages]);

  useEffect(() => {
    return () => {
      // 只中断分析流（它仍是绑定请求的 SSE）。两步出图已是后台作业，
      // 离开页面必须让它继续在服务端跑完，勿在此取消作业。
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
      revokeProductImageUrls(modelImagesRef.current);
      revokeProductImageUrls(brandLogoRef.current);
      revokeProductDocUrls(documentsRef.current);
      revokeProductDocUrls(productDocsRef.current);
    };
  }, [analysisBuffer]);

  const formLocked =
    phase === 'analyzing' || phase === 'visualGenerating' || phase === 'designGenerating';
  /**
   * 右栏是否处于「生成中」：相位（分析 SSE）或作业运行态二者取或。
   * 不能只看相位 —— 生成中允许退回上一步，退回后相位已离开 *Generating，
   * 若跟着相位走，取消按钮会在作业仍在后台跑时消失。
   */
  const generating = formLocked || jobRunning;
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
  // 分析变更后保留已出图；生成完成即落库不误删已提交结果
  const persistAnalysisStep = useCallback(
    async (
      imgs: ProductImageItem[],
      docs: ProductDocItem[],
      text: string,
      extras?: {
        planCards?: ThemePlanCard[];
        selectedThemeIds?: string[];
      },
    ) => {
      const next = await createAnalysisStepSnapshot(
        themePlan ? [] : imgs,
        docs,
        text,
        themePlan
          ? {
              planCards: extras?.planCards ?? planCards,
              selectedThemeIds: extras?.selectedThemeIds ?? selectedThemeIds,
              productDocs: productDocsRef.current,
              ...(mainImage
                ? {
                    brandLogoImages: brandLogoRef.current,
                    mainImageDescription: mainImageDescriptionRef.current,
                  }
                : {}),
            }
          : undefined,
      );
      if (isSameStepSnapshot(next, lastSnapshotsRef.current.analysis)) return;
      const saved = await saveStudioStep(task.id, 'analysis', next);
      lastSnapshotsRef.current.analysis = saved;
      if (!themePlan) setImages(saved.images);
      setDocuments(saved.documents);
      if (saved.productDocs) setProductDocs(saved.productDocs);
      if (saved.brandLogoImages) setBrandLogo(saved.brandLogoImages);
      setAnalysisText(saved.analysisText);
      if (saved.mainImageDescription) setMainImageRequirement(saved.mainImageDescription);
      if (saved.planCards) setPlanCards(saved.planCards);
      if (saved.selectedThemeIds) setSelectedThemeIds(saved.selectedThemeIds);
    },
    [
      themePlan,
      mainImage,
      planCards,
      selectedThemeIds,
      task.id,
      setImages,
      setDocuments,
      setProductDocs,
      setAnalysisText,
    ],
  );

  const persistVisualStep = useCallback(
    async (f: StudioFormState, imgs: StudioResultImage[], selectedId: string | null) => {
      const next = await createVisualStepSnapshot(
        f,
        imgs,
        selectedId,
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
        themePlan
          ? {
              images: imagesRef.current,
              // 主图 = 文案标准参考图，详情图 = 上一屏，共用同一字段（至多一张）
              referenceImageId,
              ...(detailImage ? { selectedExportIds } : {}),
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
      if (typeof saved.analysisText === 'string' && !themePlan) setAnalysisText(saved.analysisText);
      if (typeof saved.referenceImageId === 'string' || saved.referenceImageId === null) {
        setReferenceImageId(saved.referenceImageId);
      }
      if (Array.isArray(saved.selectedExportIds)) {
        setSelectedExportIds(saved.selectedExportIds);
      }
    },
    [
      detailImage,
      referenceImageId,
      selectedExportIds,
      themePlan,
      task.id,
      setDesignForm,
      setDesignResultGroups,
      setModelImages,
      setImages,
      setDocuments,
      setAnalysisText,
    ],
  );

  const jobSnapshot = job;

  // 增量套用新到达的出图事件，保住「边出边显示」。事件按槽位 id 寻址，无需下标偏移。
  useEffect(() => {
    if (!jobSnapshot || trackedStepRef.current !== jobSnapshot.stepKey) return;
    const events = jobSnapshot.data.events;
    if (events.length <= appliedEventCountRef.current) return;
    const fresh = events.slice(appliedEventCountRef.current);
    appliedEventCountRef.current = events.length;

    if (jobSnapshot.stepKey === 'visual') {
      setVisualImages((current) =>
        fresh.reduce((acc, event) => applyGenerateEvent(acc, event), current),
      );
      return;
    }
    const taskType = (jobSnapshot.data.pending.taskType ?? task.taskType) as EcommerceTaskType;
    setDesignResultGroups((current) =>
      fresh.reduce((acc, event) => applyDesignGenerateEvent(acc, taskType, event), current),
    );
  }, [jobSnapshot, task.taskType]);

  /**
   * 作业终态结算：把本批结果并入该步快照落库。
   * 结果由作业快照重算而非读 state —— 增量 effect 的 setState 要到下一帧才生效，
   * 同一帧里读 state 会漏掉最后到达的那批事件。
   */
  const settleJob = useCallback(
    async (snap: StudioJobSnapshot) => {
      const succeeded = snap.status === 'succeeded';
      const batch = restoreBatchImages(snap);
      // 生成中可以点上一步：用户若已退回其它步骤，只落库、不把相位推回去把他拽回来
      const applyPhase = shouldAdvancePhase({
        jobStepKey: snap.stepKey,
        currentPhase: phase,
        settledAtMount: settledAtMountJobId === snap.id,
      });
      try {
        if (snap.stepKey === 'visual') {
          const jobForm = snap.data.pending.form as StudioFormState;
          const merged = mergeBatchImages(visualImages, batch);
          const images = succeeded ? merged : getGeneratedImages(merged);
          setForm(jobForm);
          setVisualImages(images);
          if (applyPhase) setPhase('visual');
          if (images.length > 0) await persistVisualStep(jobForm, images, selectedVisualId);
          return;
        }
        if (snap.stepKey === 'design') {
          const jobForm = snap.data.pending.form as DesignFormState;
          const taskType = (snap.data.pending.taskType ?? task.taskType) as EcommerceTaskType;
          const merged = mergeBatchGroups(designResultGroups, taskType, batch);
          const groups = succeeded ? merged : getGeneratedDesignGroups(merged);
          setDesignForm(jobForm);
          setDesignResultGroups(groups);
          if (applyPhase) setPhase('design');
          if (Object.values(groups).some((group) => Boolean(group?.length))) {
            await persistDesignStep(jobForm, groups, modelImages);
          }
        }
      } catch (err) {
        console.error('[ecommerce-studio] settle job', err);
      } finally {
        if (snap.status === 'failed') message.error(snap.error ?? GENERATE_FAILED);
        trackedStepRef.current = null;
        releaseJob();
      }
    },
    [
      designResultGroups,
      message,
      modelImages,
      persistDesignStep,
      persistVisualStep,
      phase,
      releaseJob,
      selectedVisualId,
      setPhase,
      settledAtMountJobId,
      task.taskType,
      visualImages,
    ],
  );

  useEffect(() => {
    const snap = jobSnapshot;
    if (!snap || snap.status === 'running') return;
    if (settledJobIdRef.current === snap.id) return;
    if (trackedStepRef.current !== snap.stepKey) return;
    settledJobIdRef.current = snap.id;
    void settleJob(snap);
  }, [jobSnapshot, settleJob]);

  const streamedPlan =
    themePlan && phase === 'analyzing'
      ? (detailImage ? parseDetailImagePlan : parseMainImagePlan)(analysisText)
      : null;
  const displayPlanCards = streamedPlan ? streamedPlan.cards : planCards;

  const handleAnalyze = useCallback(async () => {
    if (
      !canStartThemePlan({
        taskType: task.taskType,
        documentCount: documents.length,
        mainImageDescription,
      })
    ) {
      message.warning(mainImage ? ANALYSIS_SOURCE_MISSING : ANALYSIS_UPLOAD_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    analysisBuffer.reset();
    setPlanCards([]);
    setSelectedThemeIds([]);
    try {
      const payload = await toThemeAnalyzePayload(
        documents,
        detailImage ? 'detailImage' : 'mainImage',
        {
          productDocs,
          mainImageDescription,
          brandLogo,
        },
      );
      const res = await fetch('/api/studio/ecommerce/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
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
        const parsed = (detailImage ? parseDetailImagePlan : parseMainImagePlan)(text);
        setPlanCards(parsed.cards);
        setPhase('analyzed');
        try {
          await persistAnalysisStep(images, documents, text, {
            planCards: parsed.cards,
            selectedThemeIds: [],
          });
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
    brandLogo,
    detailImage,
    documents,
    images,
    mainImage,
    mainImageDescription,
    message,
    persistAnalysisStep,
    productDocs,
    setPhase,
    task.taskType,
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
    const count = Number.parseInt(form.count, 10) || 1;
    const slots = pendingImagesFromCount(count, form.aspectRatio);
    setPhase('visualGenerating');
    setVisualImages([...visualImages, ...slots]);
    trackedStepRef.current = 'visual';
    appliedEventCountRef.current = 0;
    try {
      // 此处只建作业；进度由轮询 effect 增量套用，终态由 settleJob 落库
      const snapshot = await startJob({
        stepKey: 'visual',
        kind: 'generate',
        pending: { stepKey: 'visual', slots, form },
        body: await toVisualGeneratePayload(form, analysisText, images),
      });
      // 建作业幂等：服务端可能返回既有的运行中作业（本次 pending 被忽略），
      // 此时上面新建的槽位收不到任何事件，须按服务端槽位校准，否则图会重复或永远停在骨架
      if (snapshot) {
        setVisualImages((current) => syncJobSlots(current, snapshot.data.pending.slots));
      }
    } catch (err) {
      console.error('[ecommerce-studio] start visual job', err);
      // 建作业失败（api-client 已 Toast）：撤回占位并退回稳定相位
      setVisualImages(visualImages);
      setPhase('visual');
    }
  }, [analysisText, form, images, message, setPhase, startJob, visualImages]);

  const handleGenerateDesign = useCallback(async () => {
    // 主图的产品精修图非必填（无参考图时生图侧降级为文生图）；详情图与营销海报的设计步仍必须上传产品图
    if (images.length === 0 && !mainImage) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    const selectedCards = planCards.filter((card) => selectedThemeIds.includes(card.themeId));
    let analysisFromDocs = '';
    let productDocsText = '';
    if (themePlan) {
      if (selectedCards.length === 0) {
        message.warning(THEME_SELECT_MISSING);
        return;
      }
      analysisFromDocs = await readProductDocsAsText(documents);
      // 这里判读出的正文而非文件数：上传了却读不出文本时不能放行。
      // 主图的商业分析非必填，改与主图说明合判；详情图仍必须有商业分析。
      if (!analysisFromDocs && !(mainImage && mainImageDescription.trim())) {
        message.warning(mainImage ? ANALYSIS_SOURCE_MISSING : ANALYSIS_UPLOAD_MISSING);
        return;
      }
      productDocsText = productDocs.length > 0 ? await readProductDocsAsText(productDocs) : '';
    } else if (!analysisText.trim()) {
      message.warning(ANALYSIS_MISSING);
      return;
    }
    const nextDesignForm = poster
      ? { ...designForm, taskType: '营销海报' as const }
      : mainImage
        ? { ...designForm, taskType: '主图' as const }
        : detailImage
          ? { ...designForm, taskType: '详情图' as const }
          : designForm;
    let visualDataUrl = '';
    if (!themePlan) {
      const selected = getSelectedResultImageUrl(visualImages, selectedVisualId);
      if (!selected) {
        message.warning(VISUAL_SELECT_MISSING);
        return;
      }
      visualDataUrl = selected;
    }
    let previousScreenDataUrl: string | undefined;
    if (detailImage && referenceImageId !== null) {
      const selected = getSelectedResultImageUrl(
        designResultGroups['详情图'] ?? [],
        referenceImageId,
      );
      if (selected) previousScreenDataUrl = await readUrlAsDataUrl(selected);
    }
    let copyStyleReferenceDataUrl: string | undefined;
    if (mainImage && referenceImageId !== null) {
      const selected = getSelectedResultImageUrl(
        designResultGroups['主图'] ?? [],
        referenceImageId,
      );
      if (selected) {
        try {
          copyStyleReferenceDataUrl = await readUrlAsDataUrl(selected);
        } catch (err) {
          // 参考图资产读不到时降级为「不带参考图」继续出图，不把整批卡死
          console.error('[ecommerce-studio] read copy reference', err);
        }
      }
    }
    let brandLogoDataUrl: string | undefined;
    if (mainImage) {
      try {
        brandLogoDataUrl = await readBrandLogoDataUrl(brandLogo);
      } catch (err) {
        // 同文案标准参考图：Logo 读不到时降级为「不带 Logo」继续出图
        console.error('[ecommerce-studio] read brand logo', err);
      }
    }
    const taskType = nextDesignForm.taskType;
    const perCardCount = Number.parseInt(nextDesignForm.count, 10) || 1;
    const { groups: nextDesignResultGroups, slots } = themePlan
      ? appendPendingThemeImages(
          designResultGroups,
          taskType,
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
    trackedStepRef.current = 'design';
    appliedEventCountRef.current = 0;
    try {
      const body = themePlan
        ? detailImage
          ? await toDetailImageGeneratePayload(
              nextDesignForm,
              analysisFromDocs,
              selectedCards,
              images,
              previousScreenDataUrl,
              productDocsText,
            )
          : await toMainImageGeneratePayload(
              nextDesignForm,
              analysisFromDocs,
              selectedCards,
              images,
              {
                productDocumentsText: productDocsText,
                mainImageDescription,
                copyStyleReferenceDataUrl,
                brandLogoDataUrl,
              },
            )
        : await toDesignGeneratePayload(
            nextDesignForm,
            analysisText,
            images,
            await readUrlAsDataUrl(visualDataUrl),
            await toAnalyzeImages(modelImages),
          );
      const snapshot = await startJob({
        stepKey: 'design',
        kind: 'generate',
        pending: { stepKey: 'design', taskType, slots, form: nextDesignForm },
        body,
      });
      // 同 handleGenerateVisual：幂等命中旧作业时按服务端槽位校准，避免图重复或永远骨架
      if (snapshot) {
        setDesignResultGroups((current) =>
          syncJobGroupSlots(current, taskType, snapshot.data.pending.slots),
        );
      }
    } catch (err) {
      console.error('[ecommerce-studio] start design job', err);
      // 建作业失败（api-client 已 Toast）：撤回占位并退回稳定相位
      setDesignResultGroups(designResultGroups);
      setPhase('design');
    }
  }, [
    analysisText,
    brandLogo,
    designForm,
    designResultGroups,
    detailImage,
    documents,
    expectedDesignCount,
    images,
    mainImage,
    mainImageDescription,
    message,
    modelImages,
    planCards,
    poster,
    productDocs,
    referenceImageId,
    selectedThemeIds,
    selectedVisualId,
    setPhase,
    startJob,
    themePlan,
    visualImages,
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
      const singleDoc = poster || themePlan;
      setDocuments((current) => appendProductDocs(current, files, singleDoc ? 1 : undefined));
      if (poster && files[0]) {
        void files[0].text().then((text) => setAnalysisText(text));
      }
    },
    [poster, setDocuments, setAnalysisText, themePlan],
  );

  const handleDocRemove = useCallback(
    (uid: string) => {
      setDocuments((current) => removeProductDoc(current, uid));
      if (poster) setAnalysisText('');
    },
    [poster, setDocuments, setAnalysisText],
  );

  // 主图 / 详情图共用补充资料：不受 singleDoc 限制，用组件默认上限
  const handleProductDocsAppend = useCallback(
    (files: File[]) => {
      setProductDocs((current) => appendProductDocs(current, files));
    },
    [setProductDocs],
  );

  const handleProductDocRemove = useCallback(
    (uid: string) => {
      setProductDocs((current) => removeProductDoc(current, uid));
    },
    [setProductDocs],
  );

  const handleBrandLogoAppend = useCallback(
    (files: File[]) => {
      setBrandLogo((current) => appendProductImages(current, files, MAX_BRAND_LOGOS));
    },
    [setBrandLogo],
  );

  const handleBrandLogoRemove = useCallback(
    (uid: string) => {
      setBrandLogo((current) => removeProductImage(current, uid));
    },
    [setBrandLogo],
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

  const handleSelectVisual = useCallback((id: string) => {
    // 点选视觉图仅更新交互态，落库收敛到下一步/完成
    setSelectedVisualId(id);
  }, []);

  const handleSelectReference = useCallback((id: string) => {
    setReferenceImageId((current) => (current === id ? null : id));
  }, []);

  const handleSelectExport = useCallback(
    (id: string) => {
      setSelectedExportIds((current) =>
        toggleExportSelectedIdByTheme(current, id, designResultGroups['详情图'] ?? []),
      );
    },
    [designResultGroups],
  );

  const handleExportPersist = useCallback(async () => {
    try {
      await persistDesignStep(designForm, designResultGroups, modelImages);
    } catch (err) {
      console.error('[ecommerce-studio] persist design on export', err);
    }
  }, [designForm, designResultGroups, modelImages, persistDesignStep]);

  const handlePrev = useCallback(async () => {
    // 生图已后台化：返回上一步不再中断生成（要中断请用右栏按钮）。
    // 生成中该按钮本身被禁用，相位不会与运行中的作业错配。
    if (detailImage && phase === 'complete') {
      try {
        await persistDesignStep(designForm, designResultGroups, modelImages);
      } catch (err) {
        console.error('[ecommerce-studio] persist design on prev', err);
      }
    }
    setPhase((current) => phaseAfterPrev(current, poster, themePlan));
  }, [
    designForm,
    designResultGroups,
    detailImage,
    modelImages,
    persistDesignStep,
    phase,
    poster,
    setPhase,
    themePlan,
  ]);

  /** 用户主动中断：分析步中断 SSE，出图步取消后台作业（已出图保留）。 */
  const handleCancelGenerate = useCallback(() => {
    if (phase === 'analyzing') {
      abortCurrent();
      setPhase('input');
      return;
    }
    void cancelJob();
  }, [abortCurrent, cancelJob, phase, setPhase]);

  const handleNext = useCallback(async () => {
    if (phase === 'visual' && selectedVisualId === null) {
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
            : isDetailImageTask(task.taskType)
              ? DETAIL_IMAGE_RESULT_MISSING
              : DESIGN_RESULT_MISSING,
      );
      return;
    }
    // 下一步/完成：左右栏有变化才落库；PUT 或下游删除失败不跳步
    setNextLoading(true);
    try {
      if (phase === 'analyzed') {
        await persistAnalysisStep(images, documents, analysisText, { selectedThemeIds });
      } else if (phase === 'visual') {
        await persistVisualStep(form, visualImages, selectedVisualId);
      } else if (phase === 'design') {
        await persistDesignStep(designForm, designResultGroups, modelImages);
      }
      setPhase((current) => phaseAfterNext(current, themePlan));
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
    message,
    modelImages,
    persistAnalysisStep,
    persistDesignStep,
    persistVisualStep,
    phase,
    selectedThemeIds,
    selectedVisualId,
    setNextLoading,
    setPhase,
    task.taskType,
    themePlan,
    visualImages,
  ]);

  const selectedCards = planCards.filter((card) => selectedThemeIds.includes(card.themeId));

  const handleToggleTheme = useCallback(
    (themeId: string) => {
      setSelectedThemeIds((current) => {
        if (detailImage) return current[0] === themeId ? [] : [themeId];
        return current.includes(themeId)
          ? current.filter((id) => id !== themeId)
          : [...current, themeId];
      });
    },
    [detailImage],
  );

  const handlePlanCardSave = useCallback(
    (themeId: string, requirement: string) => {
      const nextCards = planCards.map((card) =>
        card.themeId === themeId ? { ...card, requirement } : card,
      );
      setPlanCards(nextCards);
      void persistAnalysisStep(images, documents, analysisText, {
        planCards: nextCards,
        selectedThemeIds,
      });
    },
    [analysisText, documents, images, persistAnalysisStep, planCards, selectedThemeIds],
  );

  const handlePlanCardAiAssist = useCallback(
    async (themeId: string, draft: string) => {
      const analysisFromDocs = await readProductDocsAsText(documents);
      // 主图的商业分析非必填，改与主图说明合判；详情图仍必须有商业分析
      if (!analysisFromDocs && !(mainImage && mainImageDescription.trim())) {
        message.warning(mainImage ? ANALYSIS_SOURCE_MISSING : ANALYSIS_UPLOAD_MISSING);
        return '';
      }
      const productDocumentsText =
        productDocs.length > 0 ? await readProductDocsAsText(productDocs) : '';
      const data = await apiPost<RewriteCardResult>('/api/studio/ecommerce/rewrite-card', {
        kind: detailImage ? 'detailImage' : 'mainImage',
        themeId,
        draft,
        otherCards: planCards
          .filter((card) => card.themeId !== themeId)
          .map((card) => ({
            themeId: card.themeId,
            title: card.title,
            requirement: card.requirement,
          })),
        analysisText: analysisFromDocs,
        ...(mainImage && mainImageDescription.trim()
          ? { mainImageDescription: mainImageDescription.trim() }
          : {}),
        ...(productDocumentsText.trim()
          ? { productDocumentsText: productDocumentsText.trim() }
          : {}),
      });
      return data.requirement;
    },
    [detailImage, documents, mainImage, mainImageDescription, message, planCards, productDocs],
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
              taskType={task.taskType}
              showDesignTitles={!themePlan}
              groupByTheme={themePlan}
              detailPreview={detailImage}
              selectedExportIds={selectedExportIds}
              onSelectExport={handleSelectExport}
              onPrev={() => void handlePrev()}
              onExportPersist={handleExportPersist}
            />
          ) : (
            <>
              <ControlPanel
                taskType={task.taskType}
                images={images}
                documents={documents}
                productDocs={productDocs}
                brandLogo={brandLogo}
                mainImageDescription={mainImageDescription}
                modelImages={modelImages}
                form={form}
                designForm={designForm}
                phase={phase}
                formLocked={formLocked}
                jobRunning={jobRunning}
                canGenerateVisual={images.length > 0 && Boolean(analysisText.trim())}
                canGenerateDesign={
                  themePlan
                    ? (mainImage || images.length > 0) &&
                      selectedCards.length > 0 &&
                      canStartThemePlan({
                        taskType: task.taskType,
                        documentCount: documents.length,
                        mainImageDescription,
                      })
                    : true
                }
                selectedCards={selectedCards}
                onImagesAppend={handleImagesAppend}
                onImageRemove={handleImageRemove}
                onDocsAppend={handleDocsAppend}
                onDocRemove={handleDocRemove}
                onProductDocsAppend={handleProductDocsAppend}
                onProductDocRemove={handleProductDocRemove}
                onBrandLogoAppend={handleBrandLogoAppend}
                onBrandLogoRemove={handleBrandLogoRemove}
                onMainImageRequirementChange={setMainImageRequirement}
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
                selectedVisualId={selectedVisualId}
                nextLoading={nextLoading}
                isPoster={poster}
                planCards={displayPlanCards}
                selectedThemeIds={selectedThemeIds}
                referenceImageId={referenceImageId}
                running={generating}
                cancelling={jobCancelling}
                onCancel={handleCancelGenerate}
                onSelectVisual={handleSelectVisual}
                onSelectReference={handleSelectReference}
                onPrev={() => void handlePrev()}
                onNext={handleNext}
                onAnalysisTextChange={setAnalysisText}
                onToggleTheme={handleToggleTheme}
                onPlanCardSave={handlePlanCardSave}
                onPlanCardAiAssist={handlePlanCardAiAssist}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
