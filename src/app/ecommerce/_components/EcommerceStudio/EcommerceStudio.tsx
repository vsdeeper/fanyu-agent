'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Layout, Steps, Typography } from 'antd';
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
  NO_IMAGE_WARNING,
  STUDIO_STEP_INDEX,
  STUDIO_STEPS,
  STUDIO_SUBTITLE,
  STUDIO_TITLE,
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
  createRafTextBuffer,
  isAbortError,
  getSelectedResultImageUrl,
  pendingImagesFromCount,
  phaseAfterNext,
  phaseAfterPrev,
  removeProductDoc,
  removeProductImage,
  readFileAsDataUrl,
  revokeProductDocUrls,
  revokeProductImageUrls,
  toAnalyzePayload,
  toDesignGeneratePayload,
  toVisualGeneratePayload,
} from './utils';
import styles from './EcommerceStudio.module.css';

/**
 * 电商设计工作台：左侧参数，右侧流式规划与出图。
 */
export default function EcommerceStudio() {
  const { message } = App.useApp();
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [documents, setDocuments] = useState<ProductDocItem[]>([]);
  const [form, setForm] = useState<StudioFormState>(DEFAULT_FORM_STATE);
  const [designForm, setDesignForm] = useState<DesignFormState>(DEFAULT_DESIGN_FORM_STATE);
  const [phase, setPhase] = useState<StudioPhase>('input');
  const [analysisText, setAnalysisText] = useState('');
  const [visualImages, setVisualImages] = useState<StudioResultImage[]>([]);
  const [designResultGroups, setDesignResultGroups] = useState<DesignResultGroups>({});
  const [selectedVisualIndex, setSelectedVisualIndex] = useState<number | null>(null);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
      revokeProductDocUrls(documentsRef.current);
    };
  }, [analysisBuffer]);

  const formLocked =
    phase === 'analyzing' || phase === 'visualGenerating' || phase === 'designGenerating';
  const analysisStreaming = phase === 'analyzing';
  const expectedVisualCount = Number.parseInt(form.count, 10) || 1;
  const expectedDesignCount = Number.parseInt(designForm.count, 10) || 1;

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
        onText: (delta) => analysisBuffer.append(delta),
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
  }, [abortCurrent, analysisBuffer, documents, images, message]);

  const handleGenerateVisual = useCallback(async () => {
    const productImage = images[0];
    if (!productImage) {
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
    setPhase('visualGenerating');
    setVisualImages((current) => [
      ...current,
      ...pendingImagesFromCount(count, batchStartIndex, form.aspectRatio),
    ]);
    try {
      const res = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          toVisualGeneratePayload(form, analysisText, await readFileAsDataUrl(productImage.file)),
        ),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        setVisualImages((current) => applyGenerateEvent(current, event, batchStartIndex));
      });
      if (controller.signal.aborted) {
        setPhase('visual');
        return;
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
  }, [abortCurrent, analysisText, form, images, message, visualImages.length]);

  const handleGenerateDesign = useCallback(async () => {
    if (!analysisText.trim()) {
      message.warning(ANALYSIS_MISSING);
      return;
    }
    const productImage = images[0];
    if (!productImage) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    const visualDataUrl = getSelectedResultImageUrl(visualImages, selectedVisualIndex);
    if (designForm.referenceVisual && !visualDataUrl) {
      message.warning(VISUAL_SELECT_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const designType = designForm.designType;
    const batchStartIndex = designResultGroups[designType]?.length ?? 0;
    setPhase('designGenerating');
    setDesignResultGroups((current) =>
      appendPendingDesignImages(current, designType, expectedDesignCount, designForm.aspectRatio),
    );
    try {
      const res = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          toDesignGeneratePayload(
            designForm,
            analysisText,
            await readFileAsDataUrl(productImage.file),
            visualDataUrl,
          ),
        ),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        setDesignResultGroups((current) =>
          applyDesignGenerateEvent(current, designType, event, batchStartIndex),
        );
      });
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
    selectedVisualIndex,
    visualImages,
  ]);

  const handleImagesAppend = useCallback((files: File[]) => {
    setImages((current) => appendProductImages(current, files));
  }, []);

  const handleImageRemove = useCallback((uid: string) => {
    setImages((current) => removeProductImage(current, uid));
  }, []);

  const handleDocsAppend = useCallback((files: File[]) => {
    setDocuments((current) => appendProductDocs(current, files));
  }, []);

  const handleDocRemove = useCallback((uid: string) => {
    setDocuments((current) => removeProductDoc(current, uid));
  }, []);

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
      message.warning(DESIGN_RESULT_MISSING);
      return;
    }
    setPhase((current) => phaseAfterNext(current));
  }, [designResultGroups, message, phase, selectedVisualIndex]);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <div className={styles.brand}>
          <Typography.Title level={5} className={styles.title} ellipsis>
            {STUDIO_TITLE}
          </Typography.Title>
          <Typography.Text className={styles.subtitle} ellipsis>
            {STUDIO_SUBTITLE}
          </Typography.Text>
        </div>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <div className={styles.stepsRow}>
        <Steps
          className={styles.steps}
          current={STUDIO_STEP_INDEX[phase]}
          size="small"
          items={STUDIO_STEPS}
        />
      </div>
      <Layout.Content className={styles.content}>
        {phase === 'complete' ? (
          <CompletionPanel
            visualImages={visualImages}
            designResultGroups={designResultGroups}
            onPrev={handlePrev}
          />
        ) : (
          <>
            <ControlPanel
              images={images}
              documents={documents}
              form={form}
              designForm={designForm}
              phase={phase}
              formLocked={formLocked}
              onImagesAppend={handleImagesAppend}
              onImageRemove={handleImageRemove}
              onDocsAppend={handleDocsAppend}
              onDocRemove={handleDocRemove}
              onFormChange={setForm}
              onDesignFormChange={setDesignForm}
              onAnalyze={handleAnalyze}
              onGenerateVisual={handleGenerateVisual}
              onGenerateDesign={handleGenerateDesign}
            />
            <ResultPanel
              phase={phase}
              analysisText={analysisText}
              analysisStreaming={analysisStreaming}
              visualImages={visualImages}
              designResultGroups={designResultGroups}
              expectedVisualCount={expectedVisualCount}
              visualAspectRatio={form.aspectRatio}
              selectedVisualIndex={selectedVisualIndex}
              onSelectVisual={setSelectedVisualIndex}
              onPrev={handlePrev}
              onNext={handleNext}
              onAnalysisTextChange={setAnalysisText}
            />
          </>
        )}
      </Layout.Content>
    </Layout>
  );
}
