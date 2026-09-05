import { useCallback, useEffect, useRef, useState } from 'react';
import { App } from 'antd';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import {
  DEFAULT_FORM,
  EXPORT_FAILED,
  GENERATE_FAILED,
  MAX_MODEL_IMAGES,
  NO_IMAGE_WARNING,
  REQUIREMENT_MISSING,
} from '../constants';
import type { ProductImageItem, ProductModelFormState, ResultImage } from '../types';
import {
  appendImages,
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  exportResultImages,
  getGeneratedImages,
  isAbortError,
  pendingImages,
  removeImage,
  revokeImageUrls,
  toProductModelPayload,
} from '../utils';

/** 管理产品模特工作台的上传、规格、生成结果与导出状态。 */
export function useProductModelStudio() {
  const { message } = App.useApp();
  const [productImages, setProductImages] = useState<ProductImageItem[]>([]);
  const [modelImages, setModelImages] = useState<ProductImageItem[]>([]);
  const [form, setForm] = useState<ProductModelFormState>(DEFAULT_FORM);
  const [results, setResults] = useState<ResultImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const productImagesRef = useRef(productImages);
  const modelImagesRef = useRef(modelImages);
  const abortRef = useRef<AbortController | null>(null);

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

  /** 提交产品模特生成并消费逐张返回的 NDJSON。 */
  const handleGenerate = useCallback(async () => {
    if (productImages.length === 0) {
      message.warning(NO_IMAGE_WARNING);
      return;
    }
    if (!form.viewRequirement.trim()) {
      message.warning(REQUIREMENT_MISSING);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const count = Number.parseInt(form.count, 10) || 1;
    const batchStartIndex = results.length;
    setGenerating(true);
    setResults((current) => [
      ...current,
      ...pendingImages(count, batchStartIndex, form.aspectRatio),
    ]);

    try {
      const response = await fetch('/api/ecommerce/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await toProductModelPayload(form, productImages, modelImages)),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        setResults((current) => applyGenerateEvent(current, event, batchStartIndex));
      });
    } catch (error) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error('[product-model] generate', error);
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setGenerating(false);
      }
    }
  }, [form, message, modelImages, productImages, results.length]);

  /** 将当前所有成功结果打包下载。 */
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
    productImages,
    modelImages,
    form,
    results,
    generating,
    exporting,
    readyCount: getGeneratedImages(results).length,
    setForm,
    handleProductImagesAppend,
    handleProductImageRemove,
    handleModelImagesAppend,
    handleModelImageRemove,
    handleGenerate,
    handleExport,
  };
}
