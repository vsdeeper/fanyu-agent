import type {
  StudioGenerateRequest,
  StudioImageInput,
} from '@/app/api/studio/_shared/generate-types';
import { PRODUCT_RETOUCH_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/product-retouch/_shared/task-constants';
import type {
  ProductRetouchStepKey,
  ProductRetouchTaskStepRecord,
} from '@/app/api/studio/product-retouch/_shared/task-types';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { apiPut } from '@/lib/shared/client/api-client';
import { patchModel } from '@/app/studio/_utils/model-options';
import {
  keepExistingImageIds,
  normalizeResultImages,
  type StudioResultImage,
} from '@/app/studio/_utils/result-images';
import {
  appendUploadItems,
  readUploadItemAsDataUrl,
  removeUploadItem,
  revokeUploadItemUrls,
  serializeUploadItem,
} from '@/app/studio/_utils/upload-items';
import type {
  MultiviewFormState,
  ProductImageItem,
  ProductRetouchMultiviewStepSnapshot,
  ProductRetouchPhase,
  ProductRetouchRefineStepSnapshot,
  RefineFormState,
} from './types';

export {
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  dropPendingImages,
  isAbortError,
  pendingImages,
} from '@/app/studio/_utils/generate-stream';
export {
  aspectRatioToSize,
  getSelectedImageUrl,
  getSelectedImageUrls,
  groupResultImagesByRatio,
  hasReadyImage,
} from '@/app/studio/_utils/result-images';
export { patchModel };
export {
  readFileAsDataUrl,
  readUrlAsDataUrl,
  readUploadItemAsDataUrl,
} from '@/app/studio/_utils/upload-items';

/** 按 uid 移除产品图并释放预览 URL。 */
export function removeProductImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  return removeUploadItem(current, uid);
}

/** 释放一组本地产品图的预览 URL。 */
export function revokeProductImageUrls(items: ProductImageItem[]): void {
  revokeUploadItemUrls(items);
}

/** 追加本地产品图并建立预览 URL，最多保留配置上限。 */
export function appendProductImages(
  current: ProductImageItem[],
  files: File[],
): ProductImageItem[] {
  return appendUploadItems(current, files, MAX_STUDIO_IMAGES, (file, previewUrl) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl,
  }));
}

/** 将产品图转换为生图接口图片输入；恢复的快照无 file 时回退到资产 URL。 */
export async function toImageInputs(items: ProductImageItem[]): Promise<StudioImageInput[]> {
  return Promise.all(
    items.map(async (item) => ({
      filename: item.file?.name ?? 'product-image',
      mediaType: item.file?.type || 'image/jpeg',
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 组装产品精修请求体；生成数量固定为 1，服务端按原图张数一对一出图。 */
export async function toRefinePayload(
  form: RefineFormState,
  images: ProductImageItem[],
  slotIds: readonly string[],
): Promise<StudioGenerateRequest> {
  return {
    kind: 'productRefine',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: 1,
    refineRequirement: form.requirement.trim(),
    images: await toImageInputs(images),
    slotIds: [...slotIds],
  };
}

/** 组装产品多视角请求体；生成数量固定为 1，全部选中精修图作为参考。 */
export function toMultiviewPayload(
  form: MultiviewFormState,
  refinedImageDataUrls: string[],
  slotIds: readonly string[],
): StudioGenerateRequest {
  return {
    kind: 'productMultiview',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: 1,
    multiviewRequirement: form.requirement.trim(),
    refinedImageDataUrls,
    slotIds: [...slotIds],
  };
}

/**
 * 切换精修标准选中项。已选则取消；未选且未达上限则追加；达上限返回 atLimit。
 */
export function toggleSelectedId(
  current: readonly string[],
  id: string,
  maxCount: number,
): { ids: string[]; atLimit: boolean } {
  if (current.includes(id)) {
    return { ids: current.filter((item) => item !== id), atLimit: false };
  }
  if (current.length >= maxCount) {
    return { ids: [...current], atLimit: true };
  }
  return { ids: [...current, id], atLimit: false };
}

/** 读取快照中的精修标准图 id；旧快照存的是数字下标，对不到 id，按未选中处理。 */
export function readSelectedIds(
  snapshot: { selectedIds?: unknown },
  results: readonly StudioResultImage[],
): string[] {
  if (!Array.isArray(snapshot.selectedIds)) return [];
  return keepExistingImageIds(
    results,
    snapshot.selectedIds.filter((id): id is string => typeof id === 'string'),
  );
}

/** 根据多视角选项返回精修步骤的后续阶段。 */
export function phaseAfterNext(
  phase: ProductRetouchPhase,
  needsMultiview: boolean,
): ProductRetouchPhase {
  if (phase !== 'refine') return phase;
  return needsMultiview ? 'multiview' : 'complete';
}

/** 根据当前阶段与多视角选项返回“上一步”阶段。 */
export function phaseAfterPrev(
  phase: ProductRetouchPhase,
  needsMultiview: boolean,
): ProductRetouchPhase {
  if (phase === 'complete' && needsMultiview) return 'multiview';
  return 'refine';
}

/** 构造产品精修步骤的完整持久化快照。 */
export async function createRefineStepSnapshot(
  form: RefineFormState,
  images: ProductImageItem[],
  results: readonly StudioResultImage[],
  selectedIds: readonly string[],
  needsMultiview: boolean,
): Promise<ProductRetouchRefineStepSnapshot> {
  return {
    form,
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    results: [...results],
    selectedIds: [...selectedIds],
    needsMultiview,
  };
}

/** 构造产品多视角步骤的完整持久化快照。 */
export function createMultiviewStepSnapshot(
  form: MultiviewFormState,
  results: readonly StudioResultImage[],
): ProductRetouchMultiviewStepSnapshot {
  return { form, results: [...results] };
}

/** 从未知 JSON 中读取产品精修快照。 */
export function readRefineStepSnapshot(
  value: unknown,
): ProductRetouchRefineStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<ProductRetouchRefineStepSnapshot>;
  if (!snapshot.form || !Array.isArray(snapshot.images) || !Array.isArray(snapshot.results))
    return undefined;
  const results = normalizeResultImages(snapshot.results);
  return {
    form: snapshot.form,
    images: snapshot.images,
    results,
    selectedIds: readSelectedIds(snapshot, results),
    needsMultiview: typeof snapshot.needsMultiview === 'boolean' ? snapshot.needsMultiview : true,
  };
}

/** 从未知 JSON 中读取产品多视角快照。 */
export function readMultiviewStepSnapshot(
  value: unknown,
): ProductRetouchMultiviewStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<ProductRetouchMultiviewStepSnapshot>;
  if (!snapshot.form || !Array.isArray(snapshot.results)) return undefined;
  return { form: snapshot.form, results: normalizeResultImages(snapshot.results) };
}

/** 比较两份可序列化步骤快照是否相同；无基线视为已变化。 */
export function isSameStepSnapshot(next: unknown, baseline: unknown): boolean {
  if (baseline === undefined) return false;
  return JSON.stringify(next) === JSON.stringify(baseline);
}

/** 保存步骤快照，并返回服务端替换资产 URL 后的数据。 */
export async function saveProductRetouchStep<T>(
  taskId: string,
  stepKey: ProductRetouchStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<ProductRetouchTaskStepRecord>(
    `/api/studio/product-retouch/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: PRODUCT_RETOUCH_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}
