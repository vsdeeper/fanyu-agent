'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { App, Button, Layout, Steps, Tag, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { EcommerceTaskDetail } from '@/app/api/ecommerce/_shared/task-types';
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
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const modelImagesRef = useRef(modelImages);
  const abortRef = useRef<AbortController | null>(null);

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
      let streamedText = '';
      await consumeAnalyzeSse(res, {
        onText: (delta) => {
          streamedText += delta;
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
        setPhase('input');
        return;
      }
      if (receivedDone) {
        const snapshot = await createAnalysisStepSnapshot(images, documents, streamedText);
        const saved = await saveStudioStep(task.id, 'analysis', snapshot);
        setImages(saved.images);
        setDocuments(saved.documents);
        setAnalysisText(saved.analysisText);
        await Promise.all([
          deleteStudioStep(task.id, 'visual'),
          deleteStudioStep(task.id, 'design'),
        ]);
        revokeProductImageUrls(modelImagesRef.current);
        setModelImages([]);
        setPhase('analyzed');
        return;
      }
      setPhase('input');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setPhase('input');
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
    message,
    setDocuments,
    setImages,
    setModelImages,
    task.id,
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
        setPhase('visual');
        return;
      }
      if (nextVisualImages.slice(batchStartIndex).some((image) => image.status === 'ready')) {
        const saved = await saveStudioStep(task.id, 'visual', {
          form,
          visualImages: nextVisualImages,
          selectedVisualIndex,
        });
        setVisualImages(saved.visualImages);
      }
      setPhase('visual');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setPhase('visual');
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
    selectedVisualIndex,
    task.id,
    visualImages,
  ]);

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
      if (
        (nextDesignResultGroups[designType] ?? [])
          .slice(batchStartIndex)
          .some((image) => image.status === 'ready')
      ) {
        const saved = await saveStudioStep(
          task.id,
          'design',
          await createDesignStepSnapshot(nextDesignForm, nextDesignResultGroups, modelImages),
        );
        setDesignForm(saved.form);
        setDesignResultGroups(saved.designResultGroups);
        setModelImages(saved.modelImages);
      }
      setPhase('design');
    } catch (err) {
      if (!isAbortError(err) && !controller.signal.aborted) {
        console.error('[ecommerce-studio] generate design', err);
        message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      }
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
    setModelImages,
    task.id,
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

  const handleSelectVisual = useCallback(
    async (index: number) => {
      setSelectedVisualIndex(index);
      const saved = await saveStudioStep(task.id, 'visual', {
        form,
        visualImages,
        selectedVisualIndex: index,
      });
      setVisualImages(saved.visualImages);
    },
    [form, task.id, visualImages],
  );

  const handlePrev = useCallback(() => {
    if (phase === 'analyzing' || phase === 'visualGenerating' || phase === 'designGenerating') {
      abortCurrent();
    }
    setPhase((current) => phaseAfterPrev(current));
  }, [abortCurrent, phase]);

  const handleNext = useCallback(() => {
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
    setPhase((current) => phaseAfterNext(current));
  }, [designResultGroups, message, phase, selectedVisualIndex, task.taskType]);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          aria-label="返回电商设计任务列表"
          onClick={() => router.push('/ecommerce')}
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
