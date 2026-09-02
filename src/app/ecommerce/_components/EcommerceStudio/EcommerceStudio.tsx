'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Layout, Steps, Typography } from 'antd';
import type { EcommerceHelpWriteData, EcommercePlanSlot } from '@/app/api/ecommerce/_shared/types';
import { apiPost } from '@/lib/shared/client/api-client';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel';
import {
  ANALYZE_FAILED,
  DEFAULT_FORM_STATE,
  GENERATE_FAILED,
  NO_IMAGE_WARNING,
  SLOTS_MISSING,
  STUDIO_STEP_INDEX,
  STUDIO_STEPS,
  STUDIO_TITLE,
} from './constants';
import ResultPanel from './ResultPanel';
import type { ProductImageItem, StudioFormState, StudioPhase, StudioResultImage } from './types';
import {
  appendProductImages,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeAnalyzeSse,
  consumeGenerateNdjson,
  createRafTextBuffer,
  isAbortError,
  pendingImagesFromSlots,
  phaseAfterPrev,
  readFileAsDataUrl,
  removeProductImage,
  revokeProductImageUrls,
  toAnalyzeImages,
  toGeneratePayload,
  toStudioFormPayload,
} from './utils';
import styles from './EcommerceStudio.module.css';

/**
 * 电商设计工作台：左侧参数，右侧流式规划与出图。
 */
export default function EcommerceStudio() {
  const { message } = App.useApp();
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [form, setForm] = useState<StudioFormState>(DEFAULT_FORM_STATE);
  const [phase, setPhase] = useState<StudioPhase>('input');
  const [helpWriteLoading, setHelpWriteLoading] = useState(false);
  const [analysisText, setAnalysisText] = useState('');
  const [slots, setSlots] = useState<EcommercePlanSlot[]>([]);
  const [resultImages, setResultImages] = useState<StudioResultImage[]>([]);
  const [analysisBuffer] = useState(() => createRafTextBuffer(setAnalysisText));
  const imagesRef = useRef(images);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      analysisBuffer.dispose();
      revokeProductImageUrls(imagesRef.current);
    };
  }, [analysisBuffer]);

  const formLocked = phase === 'analyzing' || phase === 'generating';
  const analysisStreaming = phase === 'analyzing';
  const expectedImageCount = Number.parseInt(form.count, 10) || 1;

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
    setSlots([]);
    try {
      const payload = {
        ...toStudioFormPayload(form),
        images: await toAnalyzeImages(images),
      };
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
        onDone: (nextSlots) => {
          receivedDone = true;
          setSlots(nextSlots);
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
        setPhase('confirm');
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
  }, [abortCurrent, analysisBuffer, form, images, message]);

  const handleGenerate = useCallback(async () => {
    if (slots.length === 0 || images.length === 0) {
      message.warning(slots.length === 0 ? SLOTS_MISSING : NO_IMAGE_WARNING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase('generating');
    setResultImages(pendingImagesFromSlots(slots));
    try {
      const res = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toGeneratePayload(form, images, slots)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(res);
      await consumeGenerateNdjson(res, (event) => {
        setResultImages((current) => applyGenerateEvent(current, event));
      });
      if (controller.signal.aborted) {
        setPhase('confirm');
        return;
      }
      setPhase('done');
    } catch (err) {
      if (isAbortError(err) || controller.signal.aborted) {
        setPhase('confirm');
        return;
      }
      console.error('[ecommerce-studio] generate', err);
      message.error(err instanceof Error && err.message ? err.message : GENERATE_FAILED);
      setPhase('confirm');
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [abortCurrent, form, images, message, slots]);

  const handleImagesAppend = useCallback((files: File[]) => {
    setImages((current) => appendProductImages(current, files));
  }, []);

  const handleImageRemove = useCallback((uid: string) => {
    setImages((current) => removeProductImage(current, uid));
  }, []);

  const handlePrev = useCallback(() => {
    if (phase === 'analyzing' || phase === 'generating') {
      abortCurrent();
    }
    setPhase((current) => phaseAfterPrev(current));
  }, [abortCurrent, phase]);

  const handleHelpWrite = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    const first = images[0];
    if (!first) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    setHelpWriteLoading(true);
    try {
      const imageDataUrl = await readFileAsDataUrl(first.file);
      const data = await apiPost<EcommerceHelpWriteData>('/api/ecommerce/help-write', {
        designType: form.designType,
        platform: form.platform,
        imageDataUrl,
      });
      setForm((current) => ({ ...current, requirement: data.requirement }));
    } catch {
      /* apiPost 已 Toast */
    } finally {
      setHelpWriteLoading(false);
    }
  }, [form.designType, form.platform, images, message]);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Typography.Title level={5} className={styles.title} ellipsis>
          {STUDIO_TITLE}
        </Typography.Title>
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
          form={form}
          phase={phase}
          formLocked={formLocked}
          helpWriteLoading={helpWriteLoading}
          onImagesAppend={handleImagesAppend}
          onImageRemove={handleImageRemove}
          onFormChange={setForm}
          onAnalyze={handleAnalyze}
          onHelpWrite={handleHelpWrite}
        />
        <ResultPanel
          phase={phase}
          analysisText={analysisText}
          analysisStreaming={analysisStreaming}
          images={resultImages}
          expectedImageCount={expectedImageCount}
          onPrev={handlePrev}
          onNext={() => void handleGenerate()}
          onAnalysisTextChange={setAnalysisText}
        />
      </Layout.Content>
    </Layout>
  );
}
