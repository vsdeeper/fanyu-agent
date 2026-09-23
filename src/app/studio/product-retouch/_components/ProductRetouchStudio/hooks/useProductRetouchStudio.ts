import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Form } from 'antd';
import { MAX_STUDIO_IMAGES } from '@/app/studio/_components/StudioImageUpload';
import type { ProductRetouchTaskDetail } from '@/app/api/studio/product-retouch/_shared/task-types';
import { validateForm } from '@/app/studio/_utils/form-validate';
import { ApiClientError } from '@/lib/shared/client/api-client';
import {
  revokeLocalUploadItemUrls,
  revokeReplacedLocalUploadItemUrls,
} from '@/lib/shared/client/upload-items';
import {
  DEFAULT_MULTIVIEW_FORM,
  DEFAULT_REFINE_FORM,
  GENERATE_FAILED,
  MULTIVIEW_RESULT_MISSING,
  REFINE_RESULT_MISSING,
  REFINE_SELECT_MAX,
  REFINE_SELECT_MISSING,
} from '../constants';
import type {
  ProductRetouchPanelValues,
  ProductRetouchMultiviewStepSnapshot,
  ProductRetouchPhase,
  ProductRetouchRefineStepSnapshot,
  ResultImage,
} from '../types';
import {
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  createMultiviewStepSnapshot,
  createRefineStepSnapshot,
  dropPendingImages,
  getSelectedImageUrls,
  hasReadyImage,
  isAbortError,
  isSameStepSnapshot,
  pendingImages,
  phaseAfterNext,
  phaseAfterPrev,
  pickSpecFields,
  readMultiviewStepSnapshot,
  readProductRetouchPanelValues,
  readRefineStepSnapshot,
  readUrlAsDataUrl,
  saveProductRetouchStep,
  toMultiviewPayload,
  toRefinePayload,
  toggleSelectedId,
} from '../utils';

/** 管理产品精修三步工作流的表单、选择、请求、结果与任务快照持久化。 */
export function useProductRetouchStudio(task: ProductRetouchTaskDetail) {
  const { message } = App.useApp();
  const initialRefine = readRefineStepSnapshot(task.steps.refine?.data);
  const initialMultiview = readMultiviewStepSnapshot(task.steps.multiview?.data);
  const [panelForm] = Form.useForm<ProductRetouchPanelValues>();
  // 左栏初值只算一次：Form 二次挂载是 store 赢（只补缺失键），重算只会白白多渲染
  const [panelInitialValues] = useState<ProductRetouchPanelValues>(() => ({
    images: initialRefine?.images ?? [],
    refineRequirement: (initialRefine?.form ?? DEFAULT_REFINE_FORM).requirement,
    refineSpec: pickSpecFields(initialRefine?.form ?? DEFAULT_REFINE_FORM),
    needsMultiview: initialRefine?.needsMultiview ?? true,
    multiviewRequirement: (initialMultiview?.form ?? DEFAULT_MULTIVIEW_FORM).requirement,
    multiviewSpec: pickSpecFields(initialMultiview?.form ?? DEFAULT_MULTIVIEW_FORM),
  }));
  const [phase, setPhase] = useState<ProductRetouchPhase>('refine');
  const [persisting, setPersisting] = useState(false);
  const [refineImages, setRefineImages] = useState<ResultImage[]>(initialRefine?.results ?? []);
  const [multiviewImages, setMultiviewImages] = useState<ResultImage[]>(
    initialMultiview?.results ?? [],
  );
  const [selectedRefineIds, setSelectedRefineIds] = useState<string[]>(
    initialRefine?.selectedIds ?? [],
  );
  const abortRef = useRef<AbortController | null>(null);
  const lastSnapshotsRef = useRef<{
    refine: ProductRetouchRefineStepSnapshot | undefined;
    multiview: ProductRetouchMultiviewStepSnapshot | undefined;
  }>({
    refine: initialRefine,
    multiview: initialMultiview,
  });
  // 供渲染取用；preserve 让左栏卸载后也读得到，首帧 store 未播种时回落到初值
  const watched = Form.useWatch([], { form: panelForm, preserve: true });
  const panelValues: ProductRetouchPanelValues = watched ?? panelInitialValues;

  useEffect(
    () => () => {
      abortRef.current?.abort();
      // 完成步的 cleanup 也会走到这里：此时面板虽已卸载，store 仍保留本次会话的值，
      // 故用 getFieldsValue(true) 读整表；重复释放同一个 object URL 是幂等的
      const { images } = readProductRetouchPanelValues(panelForm.getFieldsValue(true));
      revokeLocalUploadItemUrls(images);
    },
    [panelForm],
  );

  /** 中止当前生图请求。 */
  const abortCurrent = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  // 落盘与下一步/完成共用同一份动作：把当前步左栏 + 右栏整体快照入库（data: URL 由服务端转资产 URL）
  const persistRefineStep = useCallback(
    async (results: ResultImage[]) => {
      const { refineForm, images, needsMultiview } = readProductRetouchPanelValues(
        panelForm.getFieldsValue(true),
      );
      const next = await createRefineStepSnapshot(
        refineForm,
        images,
        results,
        selectedRefineIds,
        needsMultiview,
      );
      if (isSameStepSnapshot(next, lastSnapshotsRef.current.refine)) return;
      const saved = await saveProductRetouchStep(task.id, 'refine', next);
      lastSnapshotsRef.current.refine = saved;
      revokeReplacedLocalUploadItemUrls(images, saved.images);
      // setFieldsValue 只更新 store 并通知 watch，不触发 onValuesChange，故不会与用户输入形成回环
      panelForm.setFieldsValue({ images: saved.images });
      setRefineImages(saved.results);
    },
    [task.id, panelForm, selectedRefineIds],
  );

  const persistMultiviewStep = useCallback(
    async (results: ResultImage[]) => {
      const { multiviewForm } = readProductRetouchPanelValues(panelForm.getFieldsValue(true));
      const next = createMultiviewStepSnapshot(multiviewForm, results);
      if (isSameStepSnapshot(next, lastSnapshotsRef.current.multiview)) return;
      const saved = await saveProductRetouchStep(task.id, 'multiview', next);
      lastSnapshotsRef.current.multiview = saved;
      setMultiviewImages(saved.results);
    },
    [task.id, panelForm],
  );

  /** 提交产品精修并消费逐张返回的 NDJSON；生成完成即落库（与下一步/完成同一动作）。 */
  const handleRefine = useCallback(async () => {
    if (!(await validateForm(panelForm))) return;

    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const { refineForm, images } = readProductRetouchPanelValues(panelForm.getFieldsValue(true));
    const count = images.length;
    const slots = pendingImages(count, refineForm.aspectRatio);
    let nextRefineImages = [...refineImages, ...slots];
    setPhase('refineGenerating');
    setRefineImages(nextRefineImages);
    try {
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          await toRefinePayload(
            refineForm,
            images,
            slots.map((slot) => slot.id),
          ),
        ),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        if (controller.signal.aborted) return;
        nextRefineImages = applyGenerateEvent(nextRefineImages, event);
        setRefineImages(nextRefineImages);
      });
      if (controller.signal.aborted) return;
      setPhase('refine');
      try {
        await persistRefineStep(nextRefineImages);
      } catch (err) {
        console.error('[product-retouch] persist refine', err);
      }
    } catch (error) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error('[product-retouch] refine', error);
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
        // 仅失败时回到该生成前相位；成功路径已在 try 内 setPhase，避免 finally 在异步落盘期间覆盖用户已推进的相位
        setPhase('refine');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [abortCurrent, message, panelForm, persistRefineStep, refineImages]);

  /** 以选中的精修标准图生成产品多视角；生成完成即落库（与下一步/完成同一动作）。 */
  const handleMultiview = useCallback(async () => {
    const selectedRefinedUrls = getSelectedImageUrls(refineImages, selectedRefineIds);
    if (selectedRefinedUrls.length === 0) {
      message.warning(REFINE_SELECT_MISSING);
      return;
    }
    if (!(await validateForm(panelForm))) return;

    abortCurrent();
    const controller = new AbortController();
    abortRef.current = controller;
    const { multiviewForm } = readProductRetouchPanelValues(panelForm.getFieldsValue(true));
    const slots = pendingImages(1, multiviewForm.aspectRatio);
    let nextMultiviewImages = [...multiviewImages, ...slots];
    setPhase('multiviewGenerating');
    setMultiviewImages(nextMultiviewImages);
    try {
      // 恢复后的标准图为站内资产 URL，需先转成 data URL 再入参
      const refinedImageDataUrls = await Promise.all(
        selectedRefinedUrls.map((url) => readUrlAsDataUrl(url)),
      );
      const response = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          toMultiviewPayload(
            multiviewForm,
            refinedImageDataUrls,
            slots.map((slot) => slot.id),
          ),
        ),
        signal: controller.signal,
      });
      await assertOkOrJsonFail(response);
      await consumeGenerateNdjson(response, (event) => {
        if (controller.signal.aborted) return;
        nextMultiviewImages = applyGenerateEvent(nextMultiviewImages, event);
        setMultiviewImages(nextMultiviewImages);
      });
      if (controller.signal.aborted) return;
      setPhase('multiview');
      try {
        await persistMultiviewStep(nextMultiviewImages);
      } catch (err) {
        console.error('[product-retouch] persist multiview', err);
      }
    } catch (error) {
      if (!isAbortError(error) && !controller.signal.aborted) {
        console.error('[product-retouch] multiview', error);
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
        // 仅失败时回到该生成前相位；成功路径已在 try 内 setPhase，避免 finally 在异步落盘期间覆盖用户已推进的相位
        setPhase('multiview');
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
    }
  }, [
    abortCurrent,
    message,
    multiviewImages,
    panelForm,
    persistMultiviewStep,
    refineImages,
    selectedRefineIds,
  ]);

  /** 点选精修标准图：切换选中，不落盘（落盘在「下一步/完成」时进行）。 */
  const handleSelectRefine = useCallback(
    (id: string) => {
      setSelectedRefineIds((current) => {
        const { ids, atLimit } = toggleSelectedId(current, id, MAX_STUDIO_IMAGES);
        if (atLimit) message.warning(REFINE_SELECT_MAX);
        return ids;
      });
    },
    [message],
  );

  /** 下一步：落盘精修快照并以加载态呈现，再按多视角选项进入第二步或直接完成。 */
  const handleNext = useCallback(async () => {
    if (!hasReadyImage(refineImages)) {
      message.warning(REFINE_RESULT_MISSING);
      return;
    }
    const { needsMultiview } = readProductRetouchPanelValues(panelForm.getFieldsValue(true));
    if (needsMultiview && getSelectedImageUrls(refineImages, selectedRefineIds).length === 0) {
      message.warning(REFINE_SELECT_MISSING);
      return;
    }
    setPersisting(true);
    try {
      await persistRefineStep(refineImages);
      setPhase((current) => phaseAfterNext(current, needsMultiview));
    } catch (error) {
      console.error('[product-retouch] save refine', error);
      if (!(error instanceof ApiClientError)) {
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
      }
    } finally {
      setPersisting(false);
    }
  }, [message, panelForm, persistRefineStep, refineImages, selectedRefineIds]);

  /** 完成：落盘多视角快照并以加载态呈现，再进入完成页。 */
  const handleComplete = useCallback(async () => {
    if (!hasReadyImage(multiviewImages)) {
      message.warning(MULTIVIEW_RESULT_MISSING);
      return;
    }
    setPersisting(true);
    try {
      await persistMultiviewStep(multiviewImages);
      setPhase('complete');
    } catch (error) {
      console.error('[product-retouch] save multiview', error);
      if (!(error instanceof ApiClientError)) {
        message.error(error instanceof Error && error.message ? error.message : GENERATE_FAILED);
      }
    } finally {
      setPersisting(false);
    }
  }, [message, multiviewImages, persistMultiviewStep]);

  /** 返回实际访问的上一步；生成中则中止请求并丢掉本批未完成占位。 */
  const handlePrev = useCallback(() => {
    abortCurrent();
    setMultiviewImages((current) => dropPendingImages(current));
    const { needsMultiview } = readProductRetouchPanelValues(panelForm.getFieldsValue(true));
    setPhase((current) => phaseAfterPrev(current, needsMultiview));
  }, [abortCurrent, panelForm]);

  return {
    phase,
    refineImages,
    multiviewImages,
    selectedRefineIds,
    persisting,
    locked: phase === 'refineGenerating' || phase === 'multiviewGenerating',
    panelForm,
    panelInitialValues,
    panelValues,
    handleSelectRefine,
    handleRefine,
    handleMultiview,
    handleNext,
    handleComplete,
    handlePrev,
  };
}
