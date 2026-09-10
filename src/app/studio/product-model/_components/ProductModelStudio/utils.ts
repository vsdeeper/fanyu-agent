import type {
  StudioGenerateRequest,
  StudioImageInput,
} from '@/app/api/studio/_shared/generate-types';
import { PRODUCT_MODEL_STEP_SNAPSHOT_VERSION } from '@/app/api/studio/product-model/_shared/task-constants';
import type {
  ProductModelStepKey,
  ProductModelTaskStepRecord,
} from '@/app/api/studio/product-model/_shared/task-types';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { apiPut } from '@/lib/shared/client/api-client';
import { patchModel } from '@/app/studio/_utils/model-options';
import { normalizeResultImages } from '@/app/studio/_utils/result-images';
import {
  appendGroupFiles,
  decodeImageDataUrl,
  downloadZipBlob,
  zipFiles,
} from '@/app/studio/_utils/export-archive';
import {
  appendUploadItems,
  readUploadItemAsDataUrl,
  removeUploadItem,
  revokeUploadItemUrls,
  serializeUploadItem,
} from '@/app/studio/_utils/upload-items';
import { EXPORT_ARCHIVE_NAME, MATERIAL_GROUP_TITLE } from './constants';
import type {
  ProductImageItem,
  ProductModelFormState,
  ProductModelPhase,
  ProductModelStepSnapshot,
  ResultImage,
} from './types';

export {
  applyGenerateEvent,
  assertOkOrJsonFail,
  consumeGenerateNdjson,
  isAbortError,
  pendingImages,
} from '@/app/studio/_utils/generate-stream';
export {
  aspectRatioToSize,
  getGeneratedImages,
  groupResultImagesByRatio,
  hasReadyImage,
} from '@/app/studio/_utils/result-images';
export { decodeImageDataUrl };
export { patchModel };
export {
  readFileAsDataUrl,
  readUrlAsDataUrl,
  readUploadItemAsDataUrl,
} from '@/app/studio/_utils/upload-items';

/** 追加本地图片并建立预览 URL，最多保留指定数量。 */
export function appendImages(
  current: ProductImageItem[],
  files: File[],
  max: number,
): ProductImageItem[] {
  return appendUploadItems(current, files, max, (file, previewUrl) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl,
  }));
}

/** 按 uid 移除图片并释放其预览 URL。 */
export function removeImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  return removeUploadItem(current, uid);
}

/** 释放一组本地图片的预览 URL。 */
export function revokeImageUrls(items: ProductImageItem[]): void {
  revokeUploadItemUrls(items);
}

/** 将本地图片转换为生图接口图片输入；恢复的快照无 file 时回退到资产 URL。 */
export async function toImageInputs(items: ProductImageItem[]): Promise<StudioImageInput[]> {
  return Promise.all(
    items.map(async (item) => ({
      filename: item.file?.name ?? 'product-image',
      mediaType: item.file?.type || 'image/jpeg',
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 组装产品模特生成请求体；slotIds 按本批槽位顺序，服务端据此回传每张图。 */
export async function toProductModelPayload(
  form: ProductModelFormState,
  productImages: ProductImageItem[],
  modelImages: ProductImageItem[],
  slotIds: readonly string[],
): Promise<StudioGenerateRequest> {
  return {
    kind: 'productModel',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    viewRequirement: form.viewRequirement.trim(),
    images: await toImageInputs(productImages),
    modelImages: modelImages.length > 0 ? await toImageInputs(modelImages) : undefined,
    slotIds: [...slotIds],
  };
}

/** 返回当前阶段的下一步阶段。 */
export function phaseAfterNext(phase: ProductModelPhase): ProductModelPhase {
  return phase === 'model' ? 'complete' : 'model';
}

/** 返回当前阶段的上一阶段。 */
export function phaseAfterPrev(phase: ProductModelPhase): ProductModelPhase {
  return phase === 'complete' ? 'model' : 'model';
}

/** 将已生成的产品模特图按比例打包为 ZIP 字节。 */
export async function createResultArchive(images: readonly ResultImage[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  await appendGroupFiles(files, MATERIAL_GROUP_TITLE, images);
  return zipFiles(files);
}

/** 在浏览器中生成并下载产品模特成果 ZIP。 */
export async function exportResultImages(images: readonly ResultImage[]): Promise<void> {
  downloadZipBlob(await createResultArchive(images), EXPORT_ARCHIVE_NAME);
}

/** 构造产品模特步骤的完整持久化快照。 */
export async function createModelStepSnapshot(
  form: ProductModelFormState,
  productImages: ProductImageItem[],
  modelImages: ProductImageItem[],
  results: readonly ResultImage[],
): Promise<ProductModelStepSnapshot> {
  return {
    form,
    productImages: (await Promise.all(
      productImages.map(serializeUploadItem),
    )) as ProductImageItem[],
    modelImages: (await Promise.all(modelImages.map(serializeUploadItem))) as ProductImageItem[],
    results: [...results],
  };
}

/** 从未知 JSON 中读取产品模特快照。 */
export function readModelStepSnapshot(value: unknown): ProductModelStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<ProductModelStepSnapshot>;
  if (
    !snapshot.form ||
    !Array.isArray(snapshot.productImages) ||
    !Array.isArray(snapshot.modelImages) ||
    !Array.isArray(snapshot.results)
  ) {
    return undefined;
  }
  return {
    form: snapshot.form,
    productImages: snapshot.productImages,
    modelImages: snapshot.modelImages,
    results: normalizeResultImages(snapshot.results),
  };
}

/** 比较两份可序列化步骤快照是否相同；无基线视为已变化。 */
export function isSameStepSnapshot(next: unknown, baseline: unknown): boolean {
  if (baseline === undefined) return false;
  return JSON.stringify(next) === JSON.stringify(baseline);
}

/** 保存步骤快照，并返回服务端替换资产 URL 后的数据。 */
export async function saveProductModelStep<T>(
  taskId: string,
  stepKey: ProductModelStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<ProductModelTaskStepRecord>(
    `/api/studio/product-model/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: PRODUCT_MODEL_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

export { MAX_STUDIO_IMAGES };
