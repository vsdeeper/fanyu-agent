'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Layout, Steps, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { EcommerceTaskDetail } from '@/app/api/ecommerce/_shared/task-types';
import { ECOMMERCE_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import {
  ANALYZE_FAILED,
  ANALYSIS_MISSING,
  DESIGN_RESULT_MISSING,
  DEFAULT_DESIGN_FORM_STATE,
  DEFAULT_FORM_STATE,
  GENERATE_FAILED,
  MAX_MODEL_IMAGES,
  NO_IMAGE_WARNING,
  POSTER_RESULT_MISSING,
  VISUAL_SELECT_MISSING,
} from './constants';
import ResultPanel from './ResultPanel';
import type {
  DesignFormState,
  DesignResultGroups,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioResultImage,
} from './types';
import {
  appendProductDocs,
  appendProductImages,
  appendPendingDesignImages,
  applyDesignGenerateEvent,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  consumeGenerateNdjson,
  createAnalysisStepSnapshot,
  createDesignStepSnapshot,
  deleteStudioStep,
  createRafTextBuffer,
  isAbortError,
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
  toVisualGeneratePayload,
} from './utils';
import { getWorkflowStepIndex, isPosterTask, resolveEcommerceWorkflow } from './workflow';
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
  const initialAnalysis = readAnalysisStepSnapshot(task.steps.analysis?.data);
  const initialVisual = readVisualStepSnapshot(task.steps.visual?.data);
  const initialDesign = readDesignStepSnapshot(task.steps.design?.data);
  const [images, setImages] = useState<ProductImageItem[]>(initialAnalysis?.images ?? []);
  const [documents, setDocuments] = useState<ProductDocItem[]>(initialAnalysis?.documents ?? []);
  const [form, setForm] = useState<StudioFormState>(initialVisual?.form ?? DEFAULT_FORM_STATE);
  const [designForm, setDesignForm] = useState<DesignFormState>(() => {
    const base = initialDesign?.form ?? {
      ...DEFAULT_DESIGN_FORM_STATE,
      designType: task.taskType,
    };
    return isPosterTask(task.taskType)
      ? { ...base, designType: '营销海报', referenceVisual: false }
      : base;
  });
  const [modelImages, setModelImages] = useState<ProductImageItem[]>(
    initialDesign?.modelImages ?? [],
  );
  const [phase, setPhase] = useState<StudioPhase>(resolveInitialStudioPhase(initialAnalysis));
  const [analysisText, setAnalysisText] = useState(initialAnalysis?.analysisText ?? '');
  const [visualImages, setVisualImages] = useState<StudioResultImage[]>(
    initialVisual?.visualImages ?? [],
  );
  const [designResultGroups, setDesignResultGroups] = useState<DesignResultGroups>(
    initialDesign?.designResultGroups ?? {},
  );
  const [selectedVisualIndex, setSelectedVisualIndex] = useState<number | null>(
    initialVisual?.selectedVisualIndex ?? null,
  );
  const [nextLoading, setNextLoading] = useState(false);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const modelImagesRef = useRef(modelImages);
  const abortRef = useRef<AbortController | null>(null);
  // 标记本会话是否重跑过分析：仅此时提交才使旧下游视觉/设计失效，避免「打开已有任务直接下一步」误删
  const analysisDirtyRef = useRef(false);

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
  const workflow = resolveEcommerceWorkflow(task.taskType, task.workflowVersion);

  const abortCurrent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    analysisBuffer.dispose();
  }, [analysisBuffer]);

  const handleAnalyze = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('analyzing');
    analysisBuffer.reset();
    setVisualImages([]);
    setDesignResultGroups({});
    setSelectedVisualIndex(null);
    try {
      const payload = await toAnalyzePayload(images, documents);
      const res = await fetch('/api/ecommerce/analyze', {
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
        // 分析仅产出右侧栏正文，落库收敛到下一步/完成；标记本会话重跑过分析
        revokeProductImageUrls(modelImagesRef.current);
        setModelImages([]);
        analysisDirtyRef.current = true;
        setPhase('analyzed');
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
  }, [abortCurrent, analysisBuffer, documents, images, message, setModelImages]);

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
      const res = await fetch('/api/ecommerce/generate', {
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
      // 生成仅产出右侧栏结果，落库收敛到下一步/完成
      setPhase('visual');
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
  }, [abortCurrent, analysisText, form, images, message, visualImages]);

  const handleGenerateDesign = useCallback(async () => {
    if (!analysisText.trim()) {
      message.warning(ANALYSIS_MISSING);
      return;
    }
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    const poster = isPosterTask(task.taskType);
    const nextDesignForm = poster
      ? { ...designForm, designType: '营销海报' as const, referenceVisual: false }
      : designForm;
    const visualDataUrl = getSelectedResultImageUrl(visualImages, selectedVisualIndex);
    if (nextDesignForm.referenceVisual && !visualDataUrl) {
      message.warning(VISUAL_SELECT_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const designType = nextDesignForm.designType;
    const batchStartIndex = designResultGroups[designType]?.length ?? 0;
    let nextDesignResultGroups = appendPendingDesignImages(
      designResultGroups,
      designType,
      expectedDesignCount,
      nextDesignForm.aspectRatio,
    );
    setPhase('designGenerating');
    setDesignResultGroups(nextDesignResultGroups);
    try {
      const res = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          await toDesignGeneratePayload(
            nextDesignForm,
            analysisText,
            images,
            visualDataUrl ? await readUrlAsDataUrl(visualDataUrl) : null,
            await toAnalyzeImages(modelImages),
          ),
        ),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        nextDesignResultGroups = applyDesignGenerateEvent(
          nextDesignResultGroups,
          designType,
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
      // 生成仅产出右侧栏结果，落库收敛到下一步/完成；poster 覆盖需回写表单
      setDesignForm(nextDesignForm);
      setPhase('design');
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
    message,
    modelImages,
    selectedVisualIndex,
    setDesignForm,
    task.taskType,
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
      setDocuments((current) => appendProductDocs(current, files));
    },
    [setDocuments],
  );

  const handleDocRemove = useCallback(
    (uid: string) => {
      setDocuments((current) => removeProductDoc(current, uid));
    },
    [setDocuments],
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
    if (phase === 'analyzing' || phase === 'visualGenerating' || phase === 'designGenerating') {
      abortCurrent();
    }
    setPhase((current) => phaseAfterPrev(current));
  }, [abortCurrent, phase]);

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
      message.warning(isPosterTask(task.taskType) ? POSTER_RESULT_MISSING : DESIGN_RESULT_MISSING);
      return;
    }
    // 下一步/完成即提交：把当前步骤左栏 + 右栏整体落库；失败不阻断跳步
    setNextLoading(true);
    try {
      if (phase === 'analyzed') {
        const snapshot = await createAnalysisStepSnapshot(images, documents, analysisText);
        const saved = await saveStudioStep(task.id, 'analysis', snapshot);
        setImages(saved.images);
        setDocuments(saved.documents);
        setAnalysisText(saved.analysisText);
        // 仅本会话重跑过分析才使旧下游视觉/设计失效，避免误删已提交结果
        if (analysisDirtyRef.current) {
          await Promise.all([
            deleteStudioStep(task.id, 'visual'),
            deleteStudioStep(task.id, 'design'),
          ]);
          analysisDirtyRef.current = false;
        }
      } else if (phase === 'visual') {
        const saved = await saveStudioStep(task.id, 'visual', {
          form,
          visualImages,
          selectedVisualIndex,
        });
        setForm(saved.form);
        setVisualImages(saved.visualImages);
      } else if (phase === 'design') {
        const saved = await saveStudioStep(
          task.id,
          'design',
          await createDesignStepSnapshot(designForm, designResultGroups, modelImages),
        );
        setDesignForm(saved.form);
        setDesignResultGroups(saved.designResultGroups);
        setModelImages(saved.modelImages);
      }
    } catch (err) {
      console.error('[ecommerce-studio] persist step on next', err);
    } finally {
      setNextLoading(false);
    }
    setPhase((current) => phaseAfterNext(current));
  }, [
    analysisText,
    designForm,
    designResultGroups,
    documents,
    form,
    images,
    message,
    modelImages,
    phase,
    selectedVisualIndex,
    setAnalysisText,
    setDesignForm,
    setDesignResultGroups,
    setDocuments,
    setForm,
    setImages,
    setModelImages,
    setNextLoading,
    setVisualImages,
    task.id,
    task.taskType,
    visualImages,
  ]);

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
                onSelectVisual={handleSelectVisual}
                onPrev={handlePrev}
                onNext={handleNext}
                onAnalysisTextChange={setAnalysisText}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
