import { zip } from 'fflate';
import type {
  EcommerceGenerateImageEvent,
  EcommerceGenerateRequest,
  EcommerceImageInput,
} from '@/app/api/ecommerce/_shared/types';
import { PRODUCT_MODEL_STEP_SNAPSHOT_VERSION } from '@/app/api/product-model/_shared/task-constants';
import type {
  ProductModelStepKey,
  ProductModelTaskStepRecord,
} from '@/app/api/product-model/_shared/task-types';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { ApiClientError, apiPut } from '@/lib/shared/client/api-client';
import {
  EXPORT_ARCHIVE_NAME,
  IMAGE_EXTENSION_BY_MEDIA_TYPE,
  MATERIAL_GROUP_TITLE,
} from './constants';
import { getModelCapability } from './model-options';
import type {
  ProductImageItem,
  ProductModelFormState,
  ProductModelPhase,
  ProductModelStepSnapshot,
  ResultImage,
} from './types';

/** 追加本地图片并建立预览 URL，最多保留指定数量。 */
export function appendImages(
  current: ProductImageItem[],
  files: File[],
  max: number,
): ProductImageItem[] {
  const room = max - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  return [...current, ...next];
}

/** 按 uid 移除图片并释放其预览 URL。 */
export function removeImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 释放一组本地图片的预览 URL。 */
export function revokeImageUrls(items: ProductImageItem[]): void {
  for (const item of items) URL.revokeObjectURL(item.previewUrl);
}

/** 将本地文件读取为 API 可接收的 data URL。 */
export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/** 将站内资产 URL 或已有 data URL 转为模型接口所需的 data URL。 */
export async function readUrlAsDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error('读取历史资产失败');
  return readFileAsDataUrl(await response.blob());
}

/** 读取新上传文件或已持久化资产，统一产出 data URL。 */
export async function readUploadItemAsDataUrl(item: ProductImageItem): Promise<string> {
  return item.file ? readFileAsDataUrl(item.file) : readUrlAsDataUrl(item.previewUrl);
}

/** 将本地图片转换为生图接口图片输入；恢复的快照无 file 时回退到资产 URL。 */
export async function toImageInputs(items: ProductImageItem[]): Promise<EcommerceImageInput[]> {
  return Promise.all(
    items.map(async (item) => ({
      filename: item.file?.name ?? 'product-image',
      mediaType: item.file?.type || 'image/jpeg',
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 组装产品模特生成请求体。 */
export async function toProductModelPayload(
  form: ProductModelFormState,
  productImages: ProductImageItem[],
  modelImages: ProductImageItem[],
): Promise<EcommerceGenerateRequest> {
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
  };
}

/** 为一批待生成图片建立占位状态。 */
export function pendingImages(
  count: number,
  startIndex: number,
  aspectRatio: string,
): ResultImage[] {
  return Array.from({ length: Math.max(1, count) }, (_, offset) => ({
    index: startIndex + offset,
    aspectRatio,
    status: 'pending',
  }));
}

/** 将单条流事件合并到对应批次图片状态。 */
export function applyGenerateEvent(
  current: ResultImage[],
  event: EcommerceGenerateImageEvent,
  batchStartIndex: number,
): ResultImage[] {
  const targetIndex = batchStartIndex + event.index;
  return current.map((item) =>
    item.index !== targetIndex
      ? item
      : event.error
        ? { ...item, status: 'failed', error: event.error }
        : { ...item, status: 'ready', url: event.url },
  );
}

/** 读取 NDJSON 生图响应并逐条回调。 */
export async function consumeGenerateNdjson(
  response: Response,
  onEvent: (event: EcommerceGenerateImageEvent) => void,
): Promise<void> {
  if (!response.body) throw new ApiClientError('响应格式错误');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.trim()) onEvent(JSON.parse(line) as EcommerceGenerateImageEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as EcommerceGenerateImageEvent);
}

/** 对非成功响应提取统一 JSON 信封文案并抛错。 */
export async function assertOkOrJsonFail(response: Response): Promise<void> {
  if (response.ok) return;
  if ((response.headers.get('content-type') ?? '').includes('application/json')) {
    const json = (await response.json()) as { message?: unknown };
    if (typeof json.message === 'string' && json.message) {
      throw new ApiClientError(json.message, undefined, response.status);
    }
  }
  throw new ApiClientError('请求失败，请稍后重试', undefined, response.status);
}

/** 切换模型并同步该模型默认清晰度和质量。 */
export function patchModel(form: ProductModelFormState, model: string): ProductModelFormState {
  const capability = getModelCapability(model);
  if (!capability) return { ...form, model };
  return {
    ...form,
    model,
    clarity: capability.clarityDefault,
    quality: capability.qualityDefault ?? form.quality,
  };
}

/** 判断异常是否由主动中止请求产生。 */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}

/** 将宽高比换算为固定宽度下的展示尺寸。 */
export function aspectRatioToSize(
  ratio: string,
  baseWidth: number,
): { width: number; height: number } {
  const match = /^(\d+):(\d+)$/.exec(ratio.trim());
  const width = match ? Number(match[1]) : 0;
  const height = match ? Number(match[2]) : 0;
  if (width <= 0 || height <= 0) return { width: baseWidth, height: baseWidth };
  return { width: baseWidth, height: Math.round((baseWidth * height) / width) };
}

/** 二级分类：把结果图按其比例拆成稳定顺序的子组，供按比例分组展示。 */
export function groupResultImagesByRatio<T extends ResultImage>(
  images: readonly T[],
): Array<{ aspectRatio: string; images: T[] }> {
  const order: string[] = [];
  const byRatio = new Map<string, T[]>();
  for (const image of images) {
    const key = image.aspectRatio;
    const bucket = byRatio.get(key);
    if (bucket) {
      bucket.push(image);
    } else {
      byRatio.set(key, [image]);
      order.push(key);
    }
  }
  return order.map((ratio) => ({ aspectRatio: ratio, images: byRatio.get(ratio)! }));
}

/** 仅保留有可用 URL 的已生成图片。 */
export function getGeneratedImages(
  images: readonly ResultImage[],
): Array<ResultImage & { url: string }> {
  return images.filter(
    (item): item is ResultImage & { url: string } => item.status === 'ready' && Boolean(item.url),
  );
}

/** 判断结果集中是否至少有一张已生成图片。 */
export function hasReadyImage(images: readonly ResultImage[]): boolean {
  return images.some((item) => item.status === 'ready' && Boolean(item.url));
}

/** 返回当前阶段的下一步阶段。 */
export function phaseAfterNext(phase: ProductModelPhase): ProductModelPhase {
  return phase === 'model' ? 'complete' : 'model';
}

/** 返回当前阶段的上一阶段。 */
export function phaseAfterPrev(phase: ProductModelPhase): ProductModelPhase {
  return phase === 'complete' ? 'model' : 'model';
}

/** 解析 data URL，并返回媒体类型与原始字节。 */
export function decodeImageDataUrl(dataUrl: string): {
  mediaType: string;
  bytes: Uint8Array;
} {
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(dataUrl);
  if (!match) throw new Error('无效的图片数据');
  const mediaType = match[1].toLowerCase();
  const payload = match[3];
  if (match[2]) {
    const binary = atob(payload);
    return {
      mediaType,
      bytes: Uint8Array.from(binary, (character) => character.charCodeAt(0)),
    };
  }
  return { mediaType, bytes: new TextEncoder().encode(decodeURIComponent(payload)) };
}

/** 读取新生成的 data URL 或已持久化的站内资产 URL。 */
export async function readImageBytes(source: string): Promise<{
  mediaType: string;
  bytes: Uint8Array;
}> {
  if (source.startsWith('data:')) return decodeImageDataUrl(source);
  const response = await fetch(source);
  if (!response.ok) throw new Error('读取生成物料失败');
  return {
    mediaType: response.headers.get('content-type')?.split(';')[0] ?? 'image/png',
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

/** 将一组图片按比例拆成二级子组写入待打包文件表；文件名「比例-序号」，每比例内序号从 01 起。 */
async function appendMaterialGroupFiles(
  files: Record<string, Uint8Array>,
  images: readonly ResultImage[],
): Promise<void> {
  await Promise.all(
    groupResultImagesByRatio(getGeneratedImages(images)).flatMap(
      ({ aspectRatio, images: ratioImages }) =>
        ratioImages.map(async (image, index) => {
          const { mediaType, bytes } = await readImageBytes(image.url);
          const extension = IMAGE_EXTENSION_BY_MEDIA_TYPE[mediaType] ?? 'png';
          const seq = String(index + 1).padStart(2, '0');
          files[`${MATERIAL_GROUP_TITLE}/${aspectRatio}-${seq}.${extension}`] = bytes;
        }),
    ),
  );
}

/** 将已生成的产品模特图按比例打包为 ZIP 字节。 */
export async function createResultArchive(images: readonly ResultImage[]): Promise<Uint8Array> {
  const files: Record<string, Uint8Array> = {};
  await appendMaterialGroupFiles(files, images);
  return new Promise((resolve, reject) => {
    zip(files, { level: 0 }, (error, archive) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(archive);
    });
  });
}

/** 在浏览器中生成并下载产品模特成果 ZIP。 */
export async function exportResultImages(images: readonly ResultImage[]): Promise<void> {
  const archive = await createResultArchive(images);
  const url = URL.createObjectURL(new Blob([new Uint8Array(archive)], { type: 'application/zip' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = EXPORT_ARCHIVE_NAME;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 将上传图剥离 file（不可序列化），并把本地 blob URL 转为 data URL 供服务端落盘。 */
async function serializeUploadItem(
  item: ProductImageItem,
): Promise<Omit<ProductImageItem, 'file'>> {
  const { file, ...rest } = item;
  return { ...rest, previewUrl: file ? await readFileAsDataUrl(file) : item.previewUrl };
}

/** 构造产品模特步骤的完整持久化快照。 */
export async function createModelStepSnapshot(
  form: ProductModelFormState,
  productImages: ProductImageItem[],
  modelImages: ProductImageItem[],
  results: ResultImage[],
): Promise<ProductModelStepSnapshot> {
  return {
    form,
    productImages: (await Promise.all(
      productImages.map(serializeUploadItem),
    )) as ProductImageItem[],
    modelImages: (await Promise.all(modelImages.map(serializeUploadItem))) as ProductImageItem[],
    results,
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
    results: snapshot.results,
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
    `/api/product-model/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: PRODUCT_MODEL_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

export { MAX_STUDIO_IMAGES };
