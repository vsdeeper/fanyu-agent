import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import {
  DEFAULT_MULTIVIEW_FORM,
  DEFAULT_REFINE_FORM,
  GENERATE_FAILED,
  NO_IMAGE_WARNING,
  REFINE_SELECT_MISSING,
  REQUIREMENT_MISSING,
} from './constants';
import type {
  MultiviewFormState,
  ProductImageItem,
  ProductRetouchPhase,
  RefineFormState,
  ResultImage,
} from './types';
import {
  appendProductImages,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  getSelectedImageUrl,
  isAbortError,
  pendingImages,
  phaseAfterNext,
  phaseAfterPrev,
  removeProductImage,
  revokeProductImageUrls,
  toMultiviewPayload,
  toRefinePayload,
} from './utils';

/** 管理产品精修两步工作流的表单、选择、请求与结果状态。 */
export function useProductRetouchStudio() {
  const { message } = App.useApp();
  const [phase, setPhase] = useState<ProductRetouchPhase>('refine');
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [refineForm, setRefineForm] = useState<RefineFormState>(DEFAULT_REFINE_FORM);
  const [multiviewForm, setMultiviewForm] = useState<MultiviewFormState>(DEFAULT_MULTIVIEW_FORM);
  const [refineImages, setRefineImages] = useState<ResultImage[]>([]);
  const [multiviewImages, setMultiviewImages] = useState<ResultImage[]>([]);
  const [selectedRefineIndex, setSelectedRefineIndex] = useState<number | null>(null);
  const imagesRef = useRef(images);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      revokeProductImageUrls(imagesRef.current);
    },
    [],
  );

  /** 中止当前生图请求。 */
  const abortCurrent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  /** 产品图变化后清空依赖旧输入生成的全部结果。 */
  const resetResults = useCallback(() => {
    abortCurrent();
    setPhase('refine');
    setRefineImages([]);
    setMultiviewImages([]);
    setSelectedRefineIndex(null);
  }, [abortCurrent]);

  /** 追加用户选择的产品图。 */
  const handleImagesAppend = useCallback(
    (files: File[]) => {
      resetResults();
      setImages((current) => appendProductImages(current, files));
    },
    [resetResults],
  );

  /** 移除指定产品图。 */
  const handleImageRemove = useCallback(
    (uid: string) => {
      resetResults();
      setImages((current) => removeProductImage(current, uid));
    },
    [resetResults],
  );

  /** 提交产品精修并消费逐张返回的 NDJSON。 */
  const handleRefine = useCallback(async () => {
    if (images.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    if (!refineForm.requirement.trim()) {
      message.warning(REQUIREMENT_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const count = Number.parseInt(refineForm.count, 10) || 1;
    const batchStartIndex = refineImages.length;
    setPhase('refineGenerating');
    setRefineImages((current) => [
      ...current,
      ...pendingImages(count, batchStartIndex, refineForm.aspectRatio),
    ]);
    try {
      const response = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toRefinePayload(refineForm, images)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        setRefineImages((current) => applyGenerateEvent(current, event, batchStartIndex));
      });
    } catch (error) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error('[product-retouch] refine', error);
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase('refine');
      }
    }
  }, [abortCurrent, images, message, refineForm, refineImages.length]);

  /** 以选中的精修标准图生成产品多视角。 */
  const handleMultiview = useCallback(async () => {
    const refinedImageDataUrl = getSelectedImageUrl(refineImages, selectedRefineIndex);
    if (!refinedImageDataUrl) {
      message.warning(REFINE_SELECT_MISSING);
      return;
    }
    if (!multiviewForm.requirement.trim()) {
      message.warning(REQUIREMENT_MISSING);
      return;
    }
    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const count = Number.parseInt(multiviewForm.count, 10) || 1;
    const batchStartIndex = multiviewImages.length;
    setPhase('multiviewGenerating');
    setMultiviewImages((current) => [
      ...current,
      ...pendingImages(count, batchStartIndex, multiviewForm.aspectRatio),
    ]);
    try {
      const response = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toMultiviewPayload(multiviewForm, refinedImageDataUrl)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        setMultiviewImages((current) => applyGenerateEvent(current, event, batchStartIndex));
      });
    } catch (error) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error('[product-retouch] multiview', error);
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPhase('multiview');
      }
    }
  }, [
    abortCurrent,
    message,
    multiviewForm,
    multiviewImages.length,
    refineImages,
    selectedRefineIndex,
  ]);

  /** 进入多视角步骤前确认已选择精修标准图。 */
  const handleNext = useCallback(() => {
    if (!getSelectedImageUrl(refineImages, selectedRefineIndex)) {
      message.warning(REFINE_SELECT_MISSING);
      return;
    }
    setPhase((current) => phaseAfterNext(current));
  }, [message, refineImages, selectedRefineIndex]);

  /** 返回精修步骤，并在必要时中止多视角生成。 */
  const handlePrev = useCallback(() => {
    abortCurrent();
    setPhase(phaseAfterPrev());
  }, [abortCurrent]);

  return {
    phase,
    images,
    refineForm,
    multiviewForm,
    refineImages,
    multiviewImages,
    selectedRefineIndex,
    locked: phase === 'refineGenerating' || phase === 'multiviewGenerating',
    setRefineForm,
    setMultiviewForm,
    setSelectedRefineIndex,
    handleImagesAppend,
    handleImageRemove,
    handleRefine,
    handleMultiview,
    handleNext,
    handlePrev,
  };
}
