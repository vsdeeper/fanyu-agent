import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import type { ProductModelTaskDetail } from '@/app/api/product-model/_shared/task-types';
import { ApiClientError } from '@/lib/shared/client/api-client';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import {
  DEFAULT_FORM,
  EXPORT_FAILED,
  GENERATE_FAILED,
  MAX_MODEL_IMAGES,
  MODEL_RESULT_MISSING,
  NO_IMAGE_WARNING,
  REQUIREMENT_MISSING,
} from '../constants';
import type {
  ProductImageItem,
  ProductModelFormState,
  ProductModelPhase,
  ProductModelStepSnapshot,
  ResultImage,
} from '../types';
import {
  appendImages,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  createModelStepSnapshot,
  exportResultImages,
  hasReadyImage,
  isAbortError,
  isSameStepSnapshot,
  pendingImages,
  phaseAfterPrev,
  readModelStepSnapshot,
  removeImage,
  revokeImageUrls,
  saveProductModelStep,
  toProductModelPayload,
} from '../utils';

/** 管理产品模特两步工作流的上传、规格、生成、落盘与导出。 */
export function useProductModelStudio(task: ProductModelTaskDetail) {
  const { message } = App.useApp();
  const initial = readModelStepSnapshot(task.steps.model?.data);
  const [phase, setPhase] = useState<ProductModelPhase>('model');
  const [persisting, setPersisting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [productImages, setProductImages] = useState<ProductImageItem[]>(
    initial?.productImages ?? [],
  );
  const [modelImages, setModelImages] = useState<ProductImageItem[]>(initial?.modelImages ?? []);
  const [form, setForm] = useState<ProductModelFormState>(initial?.form ?? DEFAULT_FORM);
  const [results, setResults] = useState<ResultImage[]>(initial?.results ?? []);
  const productImagesRef = useRef(productImages);
  const modelImagesRef = useRef(modelImages);
  const abortRef = useRef<AbortController | null>(null);
  const lastSnapshotRef = useRef<ProductModelStepSnapshot | undefined>(initial);
  const generating = phase === 'modelGenerating';

  useEffect(() => {
    productImagesRef.current = productImages;
  }, [productImages]);

  useEffect(() => {
    modelImagesRef.current = modelImages;
  }, [modelImages]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      revokeImageUrls(productImagesRef.current);
      revokeImageUrls(modelImagesRef.current);
    },
    [],
  );

  /** 中止当前生图请求。 */
  const abortCurrent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  /** 追加产品事实参考图。 */
  const handleProductImagesAppend = useCallback((files: File[]) => {
    setProductImages((current) => appendImages(current, files, MAX_STUDIO_IMAGES));
  }, []);

  /** 移除指定产品事实参考图。 */
  const handleProductImageRemove = useCallback((uid: string) => {
    setProductImages((current) => removeImage(current, uid));
  }, []);

  /** 追加模特身份参考图。 */
  const handleModelImagesAppend = useCallback((files: File[]) => {
    setModelImages((current) => appendImages(current, files, MAX_MODEL_IMAGES));
  }, []);

  /** 移除指定模特身份参考图。 */
  const handleModelImageRemove = useCallback((uid: string) => {
    setModelImages((current) => removeImage(current, uid));
  }, []);

  // 落盘与完成共用同一份动作：把当前步左栏 + 右栏整体快照入库（data: URL 由服务端转资产 URL）
  const persistModelStep = useCallback(
    async (results: ResultImage[]) => {
      const next = await createModelStepSnapshot(form, productImages, modelImages, results);
      if (isSameStepSnapshot(next, lastSnapshotRef.current)) return;
      const saved = await saveProductModelStep(task.id, 'model', next);
      lastSnapshotRef.current = saved;
      setProductImages(saved.productImages);
      setModelImages(saved.modelImages);
      setResults(saved.results);
    },
    [task.id, form, productImages, modelImages, setProductImages, setModelImages, setResults],
  );

  /** 提交产品模特生成并消费逐张返回的 NDJSON；生成完成即落库（与「完成」同一动作）。 */
  const handleGenerate = useCallback(async () => {
    if (productImages.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    if (!form.viewRequirement.trim()) {
      message.warning(REQUIREMENT_MISSING);
      return;
    }

    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const count = Number.parseInt(form.count, 10) || 1;
    const batchStartIndex = results.length;
    let nextResults = [...results, ...pendingImages(count, batchStartIndex, form.aspectRatio)];
    setPhase('modelGenerating');
    setResults(nextResults);

    try {
      const response = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toProductModelPayload(form, productImages, modelImages)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        nextResults = applyGenerateEvent(nextResults, event, batchStartIndex);
        setResults(nextResults);
      });
      if (controller.signal.aborted) return;
      setPhase('model');
      try {
        await persistModelStep(nextResults);
      } catch (err) {
        console.error('[product-model] persist model', err);
      }
    } catch (error) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error('[product-model] generate', error);
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
        // 仅失败时回到生成前相位；成功路径已在 try 内 setPhase，避免 finally 在异步落盘期间覆盖用户已推进的相位
        setPhase('model');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [abortCurrent, form, message, modelImages, persistModelStep, productImages, results]);

  /** 完成：校验有结果后把左右栏内容落盘，再进入「预览生成物料」。 */
  const handleComplete = useCallback(async () => {
    if (!hasReadyImage(results)) {
      message.warning(MODEL_RESULT_MISSING);
      return;
    }
    setPersisting(true);
    try {
      await persistModelStep(results);
      setPhase('complete');
    } catch (error) {
      console.error('[product-model] save model', error);
      if (!(error instanceof ApiClientError)) {
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
      }
    } finally {
      setPersisting(false);
    }
  }, [message, persistModelStep, results]);

  /** 返回上一阶段，并中止可能的生成请求。 */
  const handlePrev = useCallback(() => {
    abortCurrent();
    setPhase((current) => phaseAfterPrev(current));
  }, [abortCurrent]);

  /** 导出「预览生成物料」步骤的全部生成结果。 */
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      await exportResultImages(results);
    } catch (error) {
      console.error('[product-model] export', error);
      message.error(EXPORT_FAILED);
    } finally {
      setExporting(false);
    }
  }, [message, results]);

  return {
    phase,
    persisting,
    generating,
    exporting,
    productImages,
    modelImages,
    form,
    results,
    setForm,
    handleProductImagesAppend,
    handleProductImageRemove,
    handleModelImagesAppend,
    handleModelImageRemove,
    handleGenerate,
    handleComplete,
    handlePrev,
    handleExport,
  };
}
