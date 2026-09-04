import type {
  EcommerceGenerateImageEvent,
  EcommerceGenerateRequest,
  EcommerceImageInput,
} from '@/app/api/ecommerce/_shared/types';
import { MAX_PRODUCT_IMAGES } from '@/business-components/ProductUpload';
import { ApiClientError } from '@/lib/shared/client/api-client';
import { getModelCapability } from './model-options';
import type {
  GenerateSpecFields,
  MultiviewFormState,
  ProductImageItem,
  ProductRetouchPhase,
  RefineFormState,
  ResultImage,
} from './types';

/** 追加本地产品图并建立预览 URL，最多保留配置上限。 */
export function appendProductImages(
  current: ProductImageItem[],
  files: File[],
): ProductImageItem[] {
  const room = MAX_PRODUCT_IMAGES - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
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
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/** 将产品图转换为生图接口图片输入。 */
export async function toImageInputs(items: ProductImageItem[]): Promise<EcommerceImageInput[]> {
  return Promise.all(
    items.map(async ({ file }) => ({
      filename: file.name,
      mediaType: file.type || 'image/jpeg',
      dataUrl: await readFileAsDataUrl(file),
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
