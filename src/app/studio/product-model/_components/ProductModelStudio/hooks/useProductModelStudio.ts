import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Form } from 'antd';
import type { ProductModelTaskDetail } from '@/app/api/studio/product-model/_shared/task-types';
import { validateForm } from '@/app/studio/_utils/form-validate';
import { ApiClientError } from '@/lib/shared/client/api-client';
import {
  revokeLocalUploadItemUrls,
  revokeReplacedLocalUploadItemUrls,
} from '@/lib/shared/client/upload-items';
import { DEFAULT_FORM, GENERATE_FAILED, MODEL_RESULT_MISSING } from '../constants';
import type {
  ProductModelPanelValues,
  ProductModelPhase,
  ProductModelStepSnapshot,
  ResultImage,
} from '../types';
import {
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  createModelStepSnapshot,
  hasReadyImage,
  isAbortError,
  isSameStepSnapshot,
  pendingImages,
  phaseAfterPrev,
  pickSpecFields,
  readModelStepSnapshot,
  readProductModelPanelValues,
  saveProductModelStep,
  toProductModelPayload,
} from '../utils';

/** 管理产品模特两步工作流的上传、规格、生成、落盘与导出。 */
export function useProductModelStudio(task: ProductModelTaskDetail) {
  const { message } = App.useApp();
  const initial = readModelStepSnapshot(task.steps.model?.data);
  const [panelForm] = Form.useForm<ProductModelPanelValues>();
  // 左栏初值只算一次：Form 二次挂载是 store 赢（只补缺失键），重算只会白白多渲染
  const [panelInitialValues] = useState<ProductModelPanelValues>(() => {
    const form = initial?.form ?? DEFAULT_FORM;
    return {
      productImages: initial?.productImages ?? [],
      modelImages: initial?.modelImages ?? [],
      viewRequirement: form.viewRequirement,
      spec: pickSpecFields(form),
    };
  });
  const [phase, setPhase] = useState<ProductModelPhase>('model');
  const [persisting, setPersisting] = useState(false);
  const [results, setResults] = useState<ResultImage[]>(initial?.results ?? []);
  const abortRef = useRef<AbortController | null>(null);
  const lastSnapshotRef = useRef<ProductModelStepSnapshot | undefined>(initial);
  const generating = phase === 'modelGenerating';
  // 供渲染取用；preserve 让完成步（左栏已卸载）也读得到，首帧 store 未播种时回落到初值
  const watched = Form.useWatch([], { form: panelForm, preserve: true });
  const panelValues: ProductModelPanelValues = watched ?? panelInitialValues;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      // 完成步的 cleanup 也会走到这里：此时面板虽已卸载，store 仍保留本次会话的值，
      // 故用 getFieldsValue(true) 读整表；重复释放同一个 object URL 是幂等的
      const { productImages, modelImages } = readProductModelPanelValues(
        panelForm.getFieldsValue(true),
      );
      revokeLocalUploadItemUrls(productImages);
      revokeLocalUploadItemUrls(modelImages);
    },
    [panelForm],
  );

  /** 中止当前生图请求。 */
  const abortCurrent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // 落盘与完成共用同一份动作：把当前步左栏 + 右栏整体快照入库（data: URL 由服务端转资产 URL）
  const persistModelStep = useCallback(
    async (results: ResultImage[]) => {
      const { form, productImages, modelImages } = readProductModelPanelValues(
        panelForm.getFieldsValue(true),
      );
      const next = await createModelStepSnapshot(form, productImages, modelImages, results);
      if (isSameStepSnapshot(next, lastSnapshotRef.current)) return;
      const saved = await saveProductModelStep(task.id, 'model', next);
      lastSnapshotRef.current = saved;
      revokeReplacedLocalUploadItemUrls(productImages, saved.productImages);
      revokeReplacedLocalUploadItemUrls(modelImages, saved.modelImages);
      // setFieldsValue 只更新 store 并通知 watch，不触发 onValuesChange，故不会与用户输入形成回环
      panelForm.setFieldsValue({
        productImages: saved.productImages,
        modelImages: saved.modelImages,
      });
      setResults(saved.results);
    },
    [task.id, panelForm],
  );

  /** 提交产品模特生成并消费逐张返回的 NDJSON；生成完成即落库（与「完成」同一动作）。 */
  const handleGenerate = useCallback(async () => {
    if (!(await validateForm(panelForm))) return;

    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const { form, productImages, modelImages } = readProductModelPanelValues(
      panelForm.getFieldsValue(true),
    );
    const count = Number.parseInt(form.count, 10) || 1;
    const slots = pendingImages(count, form.aspectRatio);
    let nextResults = [...results, ...slots];
    setPhase('modelGenerating');
    setResults(nextResults);

    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          await toProductModelPayload(
            form,
            productImages,
            modelImages,
            slots.map((slot) => slot.id),
          ),
        ),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        nextResults = applyGenerateEvent(nextResults, event);
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
  }, [abortCurrent, message, panelForm, persistModelStep, results]);

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

  return {
    phase,
    persisting,
    generating,
    results,
    panelForm,
    panelInitialValues,
    panelValues,
    handleGenerate,
    handleComplete,
    handlePrev,
  };
}
