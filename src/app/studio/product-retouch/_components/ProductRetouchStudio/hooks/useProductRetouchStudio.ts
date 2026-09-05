import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { ProductRetouchTaskDetail } from '@/app/api/product-retouch/_shared/task-types';
import {
  DEFAULT_MULTIVIEW_FORM,
  DEFAULT_REFINE_FORM,
  GENERATE_FAILED,
  MULTIVIEW_RESULT_MISSING,
  NO_IMAGE_WARNING,
  REFINE_RESULT_MISSING,
  REFINE_SELECT_MISSING,
  REQUIREMENT_MISSING,
} from '../constants';
import type {
  MultiviewFormState,
  ProductImageItem,
  ProductRetouchPhase,
  RefineFormState,
  ResultImage,
} from '../types';
import {
  appendProductImages,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  createMultiviewStepSnapshot,
  createRefineStepSnapshot,
  getSelectedImageUrl,
  hasReadyImage,
  isAbortError,
  pendingImages,
  phaseAfterNext,
  phaseAfterPrev,
  readMultiviewStepSnapshot,
  readRefineStepSnapshot,
  readUrlAsDataUrl,
  removeProductImage,
  revokeProductImageUrls,
  saveProductRetouchStep,
  toMultiviewPayload,
  toRefinePayload,
} from '../utils';

/** 管理产品精修三步工作流的表单、选择、请求、结果与任务快照持久化。 */
export function useProductRetouchStudio(task: ProductRetouchTaskDetail) {
  const { message } = App.useApp();
  const initialRefine = readRefineStepSnapshot(task.steps.refine?.data);
  const initialMultiview = readMultiviewStepSnapshot(task.steps.multiview?.data);
  const [phase, setPhase] = useState<ProductRetouchPhase>('refine');
  const [persisting, setPersisting] = useState(false);
  const [needsMultiview, setNeedsMultiview] = useState(initialRefine?.needsMultiview ?? true);
  const [images, setImages] = useState<ProductImageItem[]>(initialRefine?.images ?? []);
  const [refineForm, setRefineForm] = useState<RefineFormState>(
    initialRefine?.form ?? DEFAULT_REFINE_FORM,
  );
  const [multiviewForm, setMultiviewForm] = useState<MultiviewFormState>(
    initialMultiview?.form ?? DEFAULT_MULTIVIEW_FORM,
  );
  const [refineImages, setRefineImages] = useState<ResultImage[]>(initialRefine?.results ?? []);
  const [multiviewImages, setMultiviewImages] = useState<ResultImage[]>(
    initialMultiview?.results ?? [],
  );
  const [selectedRefineIndex, setSelectedRefineIndex] = useState<number | null>(
    initialRefine?.selectedIndex ?? null,
  );
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

  /** 追加用户选择的产品图；仅更新内存，不影响已生成结果。 */
  const handleImagesAppend = useCallback((files: File[]) => {
    setImages((current) => appendProductImages(current, files));
  }, []);

  /** 移除指定产品图；仅更新内存，不影响已生成结果。 */
  const handleImageRemove = useCallback((uid: string) => {
    setImages((current) => removeProductImage(current, uid));
  }, []);

  /** 提交产品精修并消费逐张返回的 NDJSON；仅更新内存结果，落盘在「下一步/完成」时进行。 */
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
    let nextRefineImages = [
      ...refineImages,
      ...pendingImages(count, batchStartIndex, refineForm.aspectRatio),
    ];
    setPhase('refineGenerating');
    setRefineImages(nextRefineImages);
    try {
      const response = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toRefinePayload(refineForm, images)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        nextRefineImages = applyGenerateEvent(nextRefineImages, event, batchStartIndex);
        setRefineImages(nextRefineImages);
      });
      if (controller.signal.aborted) return;
      setPhase('refine');
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
  }, [abortCurrent, images, message, refineForm, refineImages]);

  /** 以选中的精修标准图生成产品多视角；仅更新内存结果，落盘在「完成」时进行。 */
  const handleMultiview = useCallback(async () => {
    const selectedRefinedUrl = getSelectedImageUrl(refineImages, selectedRefineIndex);
    if (!selectedRefinedUrl) {
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
    let nextMultiviewImages = [
      ...multiviewImages,
      ...pendingImages(count, batchStartIndex, multiviewForm.aspectRatio),
    ];
    setPhase('multiviewGenerating');
    setMultiviewImages(nextMultiviewImages);
    try {
      // 恢复后的标准图为站内资产 URL，需先转成 data URL 再入参
      const refinedImageDataUrl = await readUrlAsDataUrl(selectedRefinedUrl);
      const response = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toMultiviewPayload(multiviewForm, refinedImageDataUrl)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        nextMultiviewImages = applyGenerateEvent(nextMultiviewImages, event, batchStartIndex);
        setMultiviewImages(nextMultiviewImages);
      });
      if (controller.signal.aborted) return;
      setPhase('multiview');
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
  }, [abortCurrent, message, multiviewForm, multiviewImages, refineImages, selectedRefineIndex]);

  /** 点选精修标准图：仅更新选中，不落盘（落盘在「下一步/完成」时进行）。 */
  const handleSelectRefine = useCallback((index: number) => {
    setSelectedRefineIndex(index);
  }, []);

  /** 下一步：落盘精修快照并以加载态呈现，再按多视角选项进入第二步或直接完成。 */
  const handleNext = useCallback(async () => {
    if (!hasReadyImage(refineImages)) {
      message.warning(REFINE_RESULT_MISSING);
      return;
    }
    if (needsMultiview && !getSelectedImageUrl(refineImages, selectedRefineIndex)) {
      message.warning(REFINE_SELECT_MISSING);
      return;
    }
    setPersisting(true);
    try {
      const saved = await saveProductRetouchStep(
        task.id,
        'refine',
        await createRefineStepSnapshot(
          refineForm,
          images,
          refineImages,
          selectedRefineIndex,
          needsMultiview,
        ),
      );
      setImages(saved.images);
      setRefineImages(saved.results);
      setPhase((current) => phaseAfterNext(current, needsMultiview));
    } catch (error) {
      console.error('[product-retouch] save refine', error);
      message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
    } finally {
      setPersisting(false);
    }
  }, [images, message, needsMultiview, refineForm, refineImages, selectedRefineIndex, task.id]);

  /** 完成：落盘多视角快照并以加载态呈现，再进入完成页。 */
  const handleComplete = useCallback(async () => {
    if (!hasReadyImage(multiviewImages)) {
      message.warning(MULTIVIEW_RESULT_MISSING);
      return;
    }
    setPersisting(true);
    try {
      const saved = await saveProductRetouchStep(
        task.id,
        'multiview',
        createMultiviewStepSnapshot(multiviewForm, multiviewImages),
      );
      setMultiviewImages(saved.results);
      setPhase('complete');
    } catch (error) {
      console.error('[product-retouch] save multiview', error);
      message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
    } finally {
      setPersisting(false);
    }
  }, [message, multiviewForm, multiviewImages, task.id]);

  /** 返回实际访问的上一步，并在必要时中止多视角生成。 */
  const handlePrev = useCallback(() => {
    abortCurrent();
    setPhase((current) => phaseAfterPrev(current, needsMultiview));
  }, [abortCurrent, needsMultiview]);

  return {
    phase,
    needsMultiview,
    images,
    refineForm,
    multiviewForm,
    refineImages,
    multiviewImages,
    selectedRefineIndex,
    persisting,
    locked: phase === 'refineGenerating' || phase === 'multiviewGenerating',
    setRefineForm,
    setMultiviewForm,
    setNeedsMultiview,
    handleSelectRefine,
    handleImagesAppend,
    handleImageRemove,
    handleRefine,
    handleMultiview,
    handleNext,
    handleComplete,
    handlePrev,
  };
}
