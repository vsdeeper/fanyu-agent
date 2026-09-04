'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Layout, Steps, Typography } from 'antd';
import type { EcommerceModelHelpWriteData } from '@/app/api/ecommerce/_shared/types';
import { apiPost } from '@/lib/shared/client/api-client';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel';
import {
  ANALYZE_FAILED,
  ANALYSIS_MISSING,
  DEFAULT_FORM_STATE,
  DEFAULT_MODEL_FORM_STATE,
  DEFAULT_PRODUCT_VIEW_FORM_STATE,
  GENERATE_FAILED,
  MAX_MODEL_IMAGES,
  NO_IMAGE_WARNING,
  PRODUCT_VIEW_SELECT_MISSING,
  STUDIO_STEP_INDEX,
  STUDIO_STEPS,
  STUDIO_SUBTITLE,
  STUDIO_TITLE,
  VISUAL_SELECT_MISSING,
} from './constants';
import ResultPanel from './ResultPanel';
import type {
  ModelFormState,
  ProductDocItem,
  ProductImageItem,
  ProductViewFormState,
  StudioFormState,
  StudioPhase,
  StudioResultImage,
} from './types';
import {
  appendProductDocs,
  appendProductImages,
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
  revokeProductDocUrls,
  revokeProductImageUrls,
  toAnalyzePayload,
  toModelGeneratePayload,
  toModelHelpWritePayload,
  toProductViewGeneratePayload,
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
  const [portraits, setPortraits] = useState<ProductImageItem[]>([]);
  const [form, setForm] = useState<StudioFormState>(DEFAULT_FORM_STATE);
  const [productViewForm, setProductViewForm] = useState<ProductViewFormState>(
    DEFAULT_PRODUCT_VIEW_FORM_STATE,
  );
  const [modelForm, setModelForm] = useState<ModelFormState>(DEFAULT_MODEL_FORM_STATE);
  const [phase, setPhase] = useState<StudioPhase>('input');
  const [modelHelpWriteLoading, setModelHelpWriteLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [productViewImages, setProductViewImages] = useState<StudioResultImage[]>([]);
  const [visualImages, setVisualImages] = useState<StudioResultImage[]>([]);
  const [modelImages, setModelImages] = useState<StudioResultImage[]>([]);
  const [selectedProductViewIndex, setSelectedProductViewIndex] = useState<number | null>(null);
  const [selectedVisualIndex, setSelectedVisualIndex] = useState<number | null>(null);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const documentsRef = useRef(documents);
  const portraitsRef = useRef(portraits);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    documentsRef.current = documents;
  }, [documents]);

  useEffect(() => {
    portraitsRef.current = portraits;
  }, [portraits]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
      revokeProductDocUrls(documentsRef.current);
      revokeProductImageUrls(portraitsRef.current);
    };
  }, [analysisBuffer]);

  const formLocked =
    phase === 'analyzing' ||
    phase === 'productViewGenerating' ||
    phase === 'visualGenerating' ||
    phase === 'modelGenerating';
  const analysisStreaming = phase === 'analyzing';
  const expectedProductViewCount = Number.parseInt(productViewForm.count, 10) || 1;
  const expectedVisualCount = Number.parseInt(form.count, 10) || 1;
  const expectedModelCount = Number.parseInt(modelForm.count, 10) || 1;

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
    setProductViewImages([]);
    setVisualImages([]);
    setModelImages([]);
    setSelectedProductViewIndex(null);
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

  const handleGenerateProductView = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const count = Number.parseInt(productViewForm.count, 10) || 1;
    const batchStartIndex = productViewImages.length;
    setPhase('productViewGenerating');
    setProductViewImages((current) => [
      ...current,
      ...pendingImagesFromCount(count, batchStartIndex, productViewForm.aspectRatio),
    ]);
    try {
      const res = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toProductViewGeneratePayload(productViewForm, images)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        setProductViewImages((current) => applyGenerateEvent(current, event, batchStartIndex));
      });
      if (controller.signal.aborted) {
        setPhase('productView');
        return;
      }
      setPhase('productView');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setPhase('productView');
        return;
      }
      console.error('[ecommerce-studio] generate product view', err);
      message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      setPhase('productView');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [abortCurrent, images, message, productViewForm, productViewImages.length]);

  const handleGenerateVisual = useCallback(async () => {
    const productViewDataUrl = getSelectedResultImageUrl(
      productViewImages,
      selectedProductViewIndex,
    );
    if (!productViewDataUrl) {
      message.warning(PRODUCT_VIEW_SELECT_MISSING);
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
        body: JSON.stringify(toVisualGeneratePayload(form, analysisText, productViewDataUrl)),
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
  }, [
    abortCurrent,
    analysisText,
    form,
    message,
    productViewImages,
    selectedProductViewIndex,
    visualImages.length,
  ]);

  const handleGenerateModel = useCallback(async () => {
    const visualDataUrl = getSelectedResultImageUrl(visualImages, selectedVisualIndex);
    if (!visualDataUrl) {
      message.warning(VISUAL_SELECT_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const batchStartIndex = modelImages.length;
    setPhase('modelGenerating');
    setModelImages((current) => [
      ...current,
      ...pendingImagesFromCount(expectedModelCount, batchStartIndex, modelForm.aspectRatio),
    ]);
    try {
      const res = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toModelGeneratePayload(modelForm, portraits, visualDataUrl)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        setModelImages((current) => applyGenerateEvent(current, event, batchStartIndex));
      });
      if (controller.signal.aborted) {
        setPhase('model');
        return;
      }
      setPhase('model');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setPhase('model');
        return;
      }
      console.error('[ecommerce-studio] generate model', err);
      message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      setPhase('model');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    abortCurrent,
    expectedModelCount,
    message,
    modelForm,
    modelImages.length,
    portraits,
    selectedVisualIndex,
    visualImages,
  ]);

  const handleModelHelpWrite = useCallback(async () => {
    if (!analysisText.trim()) {
      message.warning(ANALYSIS_MISSING);
      return;
    }
    const visualDataUrl = getSelectedResultImageUrl(visualImages, selectedVisualIndex);
    if (!visualDataUrl) {
      message.warning(VISUAL_SELECT_MISSING);
      return;
    }
    setModelHelpWriteLoading(true);
    try {
      const data = await apiPost<EcommerceModelHelpWriteData>(
        '/api/ecommerce/model-help-write',
        await toModelHelpWritePayload({ analysisText, visualDataUrl, portraits }),
      );
      setModelForm((current) => ({ ...current, modelRequirement: data.modelRequirement }));
    } catch {
      /* apiPost 已 Toast */
    } finally {
      setModelHelpWriteLoading(false);
    }
  }, [analysisText, message, portraits, selectedVisualIndex, visualImages]);

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

  const handlePortraitsAppend = useCallback((files: File[]) => {
    setPortraits((current) => appendProductImages(current, files, MAX_MODEL_IMAGES));
  }, []);

  const handlePortraitRemove = useCallback((uid: string) => {
    setPortraits((current) => removeProductImage(current, uid));
  }, []);

  const handlePrev = useCallback(() => {
    if (
      phase === 'analyzing' ||
      phase === 'productViewGenerating' ||
      phase === 'visualGenerating' ||
      phase === 'modelGenerating'
    ) {
      abortCurrent();
    }
    setPhase((current) => phaseAfterPrev(current));
  }, [abortCurrent, phase]);

  const handleNext = useCallback(() => {
    if (phase === 'productView' && selectedProductViewIndex === null) {
      message.warning(PRODUCT_VIEW_SELECT_MISSING);
      return;
    }
    if (phase === 'visual' && selectedVisualIndex === null) {
      message.warning(VISUAL_SELECT_MISSING);
      return;
    }
    setPhase((current) => phaseAfterNext(current));
  }, [message, phase, selectedProductViewIndex, selectedVisualIndex]);

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
        <ControlPanel
          images={images}
          documents={documents}
          portraits={portraits}
          form={form}
          productViewForm={productViewForm}
          modelForm={modelForm}
          phase={phase}
          formLocked={formLocked}
          modelHelpWriteLoading={modelHelpWriteLoading}
          onImagesAppend={handleImagesAppend}
          onImageRemove={handleImageRemove}
          onDocsAppend={handleDocsAppend}
          onDocRemove={handleDocRemove}
          onPortraitsAppend={handlePortraitsAppend}
          onPortraitRemove={handlePortraitRemove}
          onFormChange={setForm}
          onProductViewFormChange={setProductViewForm}
          onModelFormChange={setModelForm}
          onAnalyze={handleAnalyze}
          onGenerateProductView={handleGenerateProductView}
          onGenerateVisual={handleGenerateVisual}
          onGenerateModel={handleGenerateModel}
          onModelHelpWrite={handleModelHelpWrite}
        />
        <ResultPanel
          phase={phase}
          analysisText={analysisText}
          analysisStreaming={analysisStreaming}
          productViewImages={productViewImages}
          visualImages={visualImages}
          modelImages={modelImages}
          expectedProductViewCount={expectedProductViewCount}
          expectedVisualCount={expectedVisualCount}
          expectedModelCount={expectedModelCount}
          productViewAspectRatio={productViewForm.aspectRatio}
          visualAspectRatio={form.aspectRatio}
          modelAspectRatio={modelForm.aspectRatio}
          selectedProductViewIndex={selectedProductViewIndex}
          selectedVisualIndex={selectedVisualIndex}
          onSelectProductView={setSelectedProductViewIndex}
          onSelectVisual={setSelectedVisualIndex}
          onPrev={handlePrev}
          onNext={handleNext}
          onAnalysisTextChange={setAnalysisText}
        />
      </Layout.Content>
    </Layout>
  );
}
