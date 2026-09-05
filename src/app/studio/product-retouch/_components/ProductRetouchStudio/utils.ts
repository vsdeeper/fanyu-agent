import type {
  EcommerceGenerateImageEvent,
  EcommerceGenerateRequest,
  EcommerceImageInput,
} from '@/app/api/ecommerce/_shared/types';
import { PRODUCT_RETOUCH_STEP_SNAPSHOT_VERSION } from '@/app/api/product-retouch/_shared/task-constants';
import type {
  ProductRetouchStepKey,
  ProductRetouchTaskStepRecord,
} from '@/app/api/product-retouch/_shared/task-types';
import { MAX_STUDIO_IMAGES } from '@/business-components/StudioImageUpload';
import { ApiClientError, apiPut } from '@/lib/shared/client/api-client';
import { getModelCapability } from './model-options';
import type {
  GenerateSpecFields,
  MultiviewFormState,
  ProductImageItem,
  ProductRetouchMultiviewStepSnapshot,
  ProductRetouchPhase,
  ProductRetouchRefineStepSnapshot,
  RefineFormState,
  ResultImage,
} from './types';

/** 追加本地产品图并建立预览 URL，最多保留配置上限。 */
export function appendProductImages(
  current: ProductImageItem[],
  files: File[],
): ProductImageItem[] {
  const room = MAX_STUDIO_IMAGES - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  return [...current, ...next];
}

/** 按 uid 移除产品图并释放预览 URL。 */
export function removeProductImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 释放一组本地产品图的预览 URL。 */
export function revokeProductImageUrls(items: ProductImageItem[]): void {
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

/** 将产品图转换为生图接口图片输入；恢复的快照无 file 时回退到资产 URL。 */
export async function toImageInputs(items: ProductImageItem[]): Promise<EcommerceImageInput[]> {
  return Promise.all(
    items.map(async (item) => ({
      filename: item.file?.name ?? 'product-image',
      mediaType: item.file?.type || 'image/jpeg',
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 组装产品精修请求体。 */
export async function toRefinePayload(
  form: RefineFormState,
  images: ProductImageItem[],
): Promise<EcommerceGenerateRequest> {
  return {
    kind: 'productRefine',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    refineRequirement: form.requirement.trim(),
    images: await toImageInputs(images),
  };
}

/** 组装产品多视角请求体。 */
export function toMultiviewPayload(
  form: MultiviewFormState,
  refinedImageDataUrl: string,
): EcommerceGenerateRequest {
  return {
    kind: 'productMultiview',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    multiviewRequirement: form.requirement.trim(),
    refinedImageDataUrl,
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

/** 返回点选且已就绪的结果图 URL。 */
export function getSelectedImageUrl(
  images: readonly ResultImage[],
  selectedIndex: number | null,
): string | null {
  if (selectedIndex === null) return null;
  const image = images.find((item) => item.index === selectedIndex);
  return image?.status === 'ready' && image.url ? image.url : null;
}

/** 判断结果集中是否至少有一张已生成图片。 */
export function hasReadyImage(images: readonly ResultImage[]): boolean {
  return images.some((item) => item.status === 'ready' && Boolean(item.url));
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

/** 切换模型并同步该模型默认清晰度和质量。 */
export function patchModel<T extends GenerateSpecFields>(form: T, model: string): T {
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

/** 将上传图剥离 file（不可序列化），并把本地 blob URL 转为 data URL 供服务端落盘。 */
async function serializeUploadItem(
  item: ProductImageItem,
): Promise<Omit<ProductImageItem, 'file'>> {
  const { file, ...rest } = item;
  return { ...rest, previewUrl: file ? await readFileAsDataUrl(file) : item.previewUrl };
}

/** 构造产品精修步骤的完整持久化快照。 */
export async function createRefineStepSnapshot(
  form: RefineFormState,
  images: ProductImageItem[],
  results: ResultImage[],
  selectedIndex: number | null,
  needsMultiview: boolean,
): Promise<ProductRetouchRefineStepSnapshot> {
  return {
    form,
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    results,
    selectedIndex,
    needsMultiview,
  };
}

/** 构造产品多视角步骤的完整持久化快照。 */
export function createMultiviewStepSnapshot(
  form: MultiviewFormState,
  results: ResultImage[],
): ProductRetouchMultiviewStepSnapshot {
  return { form, results };
}

/** 从未知 JSON 中读取产品精修快照。 */
export function readRefineStepSnapshot(
  value: unknown,
): ProductRetouchRefineStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<ProductRetouchRefineStepSnapshot>;
  if (!snapshot.form || !Array.isArray(snapshot.images) || !Array.isArray(snapshot.results))
    return undefined;
  return {
    form: snapshot.form,
    images: snapshot.images,
    results: snapshot.results,
    selectedIndex: typeof snapshot.selectedIndex === 'number' ? snapshot.selectedIndex : null,
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
  return { form: snapshot.form, results: snapshot.results };
}

/** 保存步骤快照，并返回服务端替换资产 URL 后的数据。 */
export async function saveProductRetouchStep<T>(
  taskId: string,
  stepKey: ProductRetouchStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<ProductRetouchTaskStepRecord>(
    `/api/product-retouch/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: PRODUCT_RETOUCH_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}
