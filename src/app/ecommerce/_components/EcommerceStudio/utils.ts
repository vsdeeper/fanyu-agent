import { ANALYZE_SSE_EVENT } from '@/app/api/ecommerce/_shared/constants';
import type {
  EcommerceAnalyzeErrorEvent,
  EcommerceAnalyzeRequest,
  EcommerceAnalyzeTextEvent,
  EcommerceDocumentInput,
  EcommerceGenerateImageEvent,
  EcommerceGenerateRequest,
  EcommerceImageInput,
} from '@/app/api/ecommerce/_shared/types';
import { ECOMMERCE_STEP_SNAPSHOT_VERSION } from '@/app/api/ecommerce/_shared/task-constants';
import type {
  EcommerceStepKey,
  EcommerceTaskStepRecord,
} from '@/app/api/ecommerce/_shared/task-types';
import { MAX_PRODUCT_DOCS } from '@/business-components/ProductDocsUpload';
import { MAX_PRODUCT_IMAGES } from '@/business-components/ProductUpload';
import { ApiClientError, apiDelete, apiPut } from '@/lib/shared/client/api-client';
import type {
  AnalysisStepSnapshot,
  DesignStepSnapshot,
  DesignFormState,
  DesignResultGroups,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioResultImage,
  VisualStepSnapshot,
} from './types';
import type { EcommerceDesignType } from '@/app/api/ecommerce/_shared/types';

/**
 * 将选择的文件追加为本地预览项；超出上限的部分丢弃。
 */
export function appendProductImages(
  current: ProductImageItem[],
  files: File[],
  max = MAX_PRODUCT_IMAGES,
): ProductImageItem[] {
  const room = max - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    mimeType: file.type || 'image/jpeg',
    size: file.size,
  }));
  return [...current, ...next];
}

/** 按 uid 移除预览项并释放 object URL */
export function removeProductImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 卸载时释放全部 object URL */
export function revokeProductImageUrls(items: ProductImageItem[]): void {
  for (const item of items) {
    if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
  }
}

/**
 * 将选择的资料追加为本地项；超出上限的部分丢弃。
 */
export function appendProductDocs(current: ProductDocItem[], files: File[]): ProductDocItem[] {
  const room = MAX_PRODUCT_DOCS - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    name: file.name,
    mimeType: toDocMediaType(file),
    size: file.size,
  }));
  return [...current, ...next];
}

/** 按 uid 移除资料并释放 object URL */
export function removeProductDoc(current: ProductDocItem[], uid: string): ProductDocItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target?.previewUrl.startsWith('blob:')) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 卸载时释放资料 object URL */
export function revokeProductDocUrls(items: ProductDocItem[]): void {
  for (const item of items) {
    if (item.previewUrl.startsWith('blob:')) URL.revokeObjectURL(item.previewUrl);
  }
}

/** 把本地文件或响应 Blob 读成 data URL，供 JSON 入参 */
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

/** 读取新上传文件或已持久化资产。 */
export function readUploadItemAsDataUrl(
  item: Pick<ProductImageItem | ProductDocItem, 'file' | 'previewUrl'>,
): Promise<string> {
  return item.file ? readFileAsDataUrl(item.file) : readUrlAsDataUrl(item.previewUrl);
}

/** 是否为用户主动中止 */
export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

/** 营销主视觉请求体：表单规格 + 商业分析 + 上一步全部产品图 */
export async function toVisualGeneratePayload(
  form: StudioFormState,
  analysisText: string,
  productImages: ProductImageItem[],
): Promise<EcommerceGenerateRequest> {
  return {
    kind: 'visual',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    analysisText: analysisText.trim(),
    productViewImages: await toAnalyzeImages(productImages),
  };
}

/** 视觉设计请求体：表单 + 分析/全部产品图 + 可选主视觉标准 + 可选模特形象 */
export async function toDesignGeneratePayload(
  form: DesignFormState,
  analysisText: string,
  productImages: ProductImageItem[],
  visualDataUrl: string | null,
  modelImages: EcommerceImageInput[] = [],
): Promise<EcommerceGenerateRequest> {
  const includeModel = modelImages.length > 0;
  return {
    kind: 'design',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    designType: form.designType,
    referenceVisual: form.referenceVisual,
    includeModel,
    analysisText: analysisText.trim(),
    productViewImages: await toAnalyzeImages(productImages),
    ...(form.referenceVisual && visualDataUrl ? { visualDataUrl } : {}),
    ...(includeModel ? { modelImages } : {}),
  };
}

/** 取已点选且就绪的结果图 data URL；无效返回 null */
export function getSelectedResultImageUrl(
  resultImages: readonly StudioResultImage[],
  selectedVisualIndex: number | null,
): string | null {
  if (selectedVisualIndex === null) return null;
  const item = resultImages.find((entry) => entry.index === selectedVisualIndex);
  if (!item || item.status !== 'ready' || !item.url) return null;
  return item.url;
}

/** 按扩展名补全资料 MIME，避免空 type 无法通过服务端校验 */
export function toDocMediaType(file: File): string {
  if (file.type) return file.type;
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return 'application/pdf';
  if (name.endsWith('.txt')) return 'text/plain';
  if (name.endsWith('.md')) return 'text/markdown';
  if (name.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (name.endsWith('.png')) return 'image/png';
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg';
  if (name.endsWith('.webp')) return 'image/webp';
  if (name.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

/** 本地产品图转分析接口 images 字段 */
export async function toAnalyzeImages(images: ProductImageItem[]): Promise<EcommerceImageInput[]> {
  return Promise.all(
    images.map(async (item) => ({
      filename: item.name,
      mediaType: item.mimeType || 'image/jpeg',
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 本地资料转分析接口 documents 字段 */
export async function toAnalyzeDocuments(
  documents: ProductDocItem[],
): Promise<EcommerceDocumentInput[]> {
  return Promise.all(
    documents.map(async (item) => ({
      filename: item.name,
      mediaType: item.mimeType,
      dataUrl: await readUploadItemAsDataUrl(item),
    })),
  );
}

/** 组装分析请求体：仅产品图与资料，对齐商业分析左栏 */
export async function toAnalyzePayload(
  images: ProductImageItem[],
  documents: ProductDocItem[],
): Promise<EcommerceAnalyzeRequest> {
  return {
    images: await toAnalyzeImages(images),
    ...(documents.length > 0 ? { documents: await toAnalyzeDocuments(documents) } : {}),
  };
}

function parseJsonEnvelopeMessage(body: unknown, status: number): never {
  const record = body as { message?: unknown; code?: unknown };
  const text =
    typeof record.message === 'string' && record.message.trim()
      ? record.message
      : '请求失败，请稍后重试';
  const code = typeof record.code === 'number' ? record.code : undefined;
  throw new ApiClientError(text, code, status);
}

/**
 * 非 2xx 且为 JSON 信封时抛出业务错误；流式成功响应直接放行。
 */
export async function assertOkOrJsonFail(res: Response): Promise<void> {
  if (res.ok) return;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    parseJsonEnvelopeMessage(await res.json(), res.status);
  }
  throw new ApiClientError('请求失败，请稍后重试', undefined, res.status);
}

type AnalyzeStreamHandlers = {
  onText: (delta: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
};

export type RafTextBuffer = {
  reset: () => void;
  append: (delta: string) => void;
  flushNow: () => void;
  dispose: () => void;
};

/**
 * 把流式 delta 攒到下一动画帧再 flush，避免每个 token setState 叠过 React 嵌套更新上限。
 */
export function createRafTextBuffer(onFlush: (text: string) => void): RafTextBuffer {
  let text = '';
  let frame = 0;

  const flush = () => {
    frame = 0;
    onFlush(text);
  };

  return {
    reset() {
      text = '';
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      onFlush('');
    },
    append(delta: string) {
      if (!delta) return;
      text += delta;
      if (!frame) {
        frame = requestAnimationFrame(flush);
      }
    },
    flushNow() {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      onFlush(text);
    },
    dispose() {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    },
  };
}

/**
 * 解析 analyze 自定义 SSE（event + data JSON）。
 * 文本 delta 由调用方 rAF 合并后再 setState，此处同步解析即可。
 */
export async function consumeAnalyzeSse(
  res: Response,
  handlers: AnalyzeStreamHandlers,
): Promise<void> {
  if (!res.body) {
    throw new ApiClientError('响应格式错误');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';

  const flushBlock = (block: string) => {
    let dataText = '';
    for (const rawLine of block.split('\n')) {
      const line = rawLine.replace(/\r$/, '');
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataText += line.slice(5).trim();
      }
    }
    if (!eventName || !dataText) return;
    const data: unknown = JSON.parse(dataText);
    if (eventName === ANALYZE_SSE_EVENT.text) {
      handlers.onText((data as EcommerceAnalyzeTextEvent).delta ?? '');
    } else if (eventName === ANALYZE_SSE_EVENT.done) {
      handlers.onDone();
    } else if (eventName === ANALYZE_SSE_EVENT.error) {
      handlers.onError((data as EcommerceAnalyzeErrorEvent).message || '产品分析失败，请稍后重试');
    }
    eventName = '';
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      if (!block.trim()) continue;
      flushBlock(block);
    }
  }
  if (buffer.trim()) flushBlock(buffer);
}

/**
 * 解析 generate NDJSON，每行一张结果。
 */
export async function consumeGenerateNdjson(
  res: Response,
  onEvent: (event: EcommerceGenerateImageEvent) => void,
): Promise<void> {
  if (!res.body) {
    throw new ApiClientError('响应格式错误');
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.trim()) continue;
      onEvent(JSON.parse(line) as EcommerceGenerateImageEvent);
    }
  }
  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as EcommerceGenerateImageEvent);
  }
}

/** 按生图事件和本批次起始索引更新对应网格项 */
export function applyGenerateEvent(
  current: StudioResultImage[],
  event: EcommerceGenerateImageEvent,
  batchStartIndex = 0,
): StudioResultImage[] {
  const targetIndex = batchStartIndex + event.index;
  return current.map((item) => {
    if (item.index !== targetIndex) return item;
    if (event.error) {
      return { ...item, status: 'failed', error: event.error };
    }
    return {
      ...item,
      status: 'ready',
      url: event.url,
    };
  });
}

/** 从指定索引起按张数创建一个 pending 批次，并记录该批次的展示比例 */
export function pendingImagesFromCount(
  count: number,
  startIndex: number,
  aspectRatio: string,
): StudioResultImage[] {
  const total = Math.max(1, count);
  return Array.from({ length: total }, (_, offset) => ({
    index: startIndex + offset,
    aspectRatio,
    status: 'pending' as const,
  }));
}

/** 向指定设计类型追加一个 pending 批次，不影响其他类型和既有结果 */
export function appendPendingDesignImages(
  current: DesignResultGroups,
  designType: EcommerceDesignType,
  count: number,
  aspectRatio: string,
): DesignResultGroups {
  const images = current[designType] ?? [];
  return {
    ...current,
    [designType]: [...images, ...pendingImagesFromCount(count, images.length, aspectRatio)],
  };
}

/** 将一条流式生图事件写入指定设计类型的当前批次 */
export function applyDesignGenerateEvent(
  current: DesignResultGroups,
  designType: EcommerceDesignType,
  event: EcommerceGenerateImageEvent,
  batchStartIndex: number,
): DesignResultGroups {
  return {
    ...current,
    [designType]: applyGenerateEvent(current[designType] ?? [], event, batchStartIndex),
  };
}

/** 将上传项转换为可持久化快照；本地 blob URL 会替换为 data URL。 */
async function serializeUploadItem<T extends ProductImageItem | ProductDocItem>(
  item: T,
): Promise<Omit<T, 'file'>> {
  const serializable = Object.fromEntries(
    Object.entries(item).filter(([key]) => key !== 'file'),
  ) as Omit<T, 'file'>;
  return {
    ...serializable,
    previewUrl: item.file ? await readFileAsDataUrl(item.file) : item.previewUrl,
  };
}

/** 构造商业分析步骤的完整持久化快照。 */
export async function createAnalysisStepSnapshot(
  images: ProductImageItem[],
  documents: ProductDocItem[],
  analysisText: string,
): Promise<AnalysisStepSnapshot> {
  return {
    images: (await Promise.all(images.map(serializeUploadItem))) as ProductImageItem[],
    documents: (await Promise.all(documents.map(serializeUploadItem))) as ProductDocItem[],
    analysisText,
  };
}

/** 保存步骤快照，并返回服务端替换资产 URL 后的数据。 */
export async function saveStudioStep<T>(
  taskId: string,
  stepKey: EcommerceStepKey,
  data: T,
): Promise<T> {
  const record = await apiPut<EcommerceTaskStepRecord>(
    `/api/ecommerce/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`,
    {
      snapshotVersion: ECOMMERCE_STEP_SNAPSHOT_VERSION,
      data,
    },
  );
  return record.data as T;
}

/** 删除已失效的下游步骤快照。 */
export async function deleteStudioStep(taskId: string, stepKey: EcommerceStepKey): Promise<void> {
  await apiDelete(`/api/ecommerce/tasks/${encodeURIComponent(taskId)}/steps/${stepKey}`, {
    silent: true,
  });
}

/** 再次进入流程时始终停在第一步：有分析正文则视为已完成分析。 */
export function resolveInitialStudioPhase(analysis: AnalysisStepSnapshot | undefined): StudioPhase {
  return analysis?.analysisText.trim() ? 'analyzed' : 'input';
}

/** 从未知 JSON 中读取商业分析快照。 */
export function readAnalysisStepSnapshot(value: unknown): AnalysisStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<AnalysisStepSnapshot>;
  if (!Array.isArray(snapshot.images) || !Array.isArray(snapshot.documents)) return undefined;
  return {
    images: snapshot.images,
    documents: snapshot.documents,
    analysisText: typeof snapshot.analysisText === 'string' ? snapshot.analysisText : '',
  };
}

/** 从未知 JSON 中读取营销主视觉快照。 */
export function readVisualStepSnapshot(value: unknown): VisualStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<VisualStepSnapshot>;
  if (!snapshot.form || !Array.isArray(snapshot.visualImages)) return undefined;
  return {
    form: snapshot.form,
    visualImages: snapshot.visualImages,
    selectedVisualIndex:
      typeof snapshot.selectedVisualIndex === 'number' ? snapshot.selectedVisualIndex : null,
  };
}

/** 从未知 JSON 中读取视觉设计快照。 */
export function readDesignStepSnapshot(value: unknown): DesignStepSnapshot | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const snapshot = value as Partial<DesignStepSnapshot>;
  if (!snapshot.form || !snapshot.designResultGroups) return undefined;
  return {
    form: snapshot.form,
    designResultGroups: snapshot.designResultGroups,
    modelImages: Array.isArray(snapshot.modelImages) ? snapshot.modelImages : [],
  };
}

/** 构造视觉设计步骤的完整持久化快照，含可选模特形象。 */
export async function createDesignStepSnapshot(
  form: DesignFormState,
  designResultGroups: DesignResultGroups,
  modelImages: ProductImageItem[],
): Promise<DesignStepSnapshot> {
  return {
    form,
    designResultGroups,
    modelImages: (await Promise.all(modelImages.map(serializeUploadItem))) as ProductImageItem[],
  };
}

/** 上一步：生图中取消回本步空闲，完成页返回视觉设计 */
export function phaseAfterPrev(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzing') return 'input';
  if (phase === 'visual' || phase === 'visualGenerating') return 'analyzed';
  if (phase === 'design' || phase === 'designGenerating') return 'visual';
  if (phase === 'complete') return 'design';
  return phase;
}

/** 下一步：分析完成后依次进入营销主视觉、视觉设计与完成页 */
export function phaseAfterNext(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzed') return 'visual';
  if (phase === 'visual') return 'design';
  if (phase === 'design') return 'complete';
  return phase;
}
