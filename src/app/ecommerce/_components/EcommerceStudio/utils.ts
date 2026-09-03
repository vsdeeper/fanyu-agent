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
import { ApiClientError } from '@/lib/shared/client/api-client';
import { MAX_PRODUCT_DOCS, MAX_PRODUCT_IMAGES } from './constants';
import type {
  ModelFormState,
  ProductDocItem,
  ProductImageItem,
  ProductViewFormState,
  StudioFormState,
  StudioPhase,
  StudioResultImage,
} from './types';

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
    uid: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  return [...current, ...next];
}

/** 按 uid 移除预览项并释放 object URL */
export function removeProductImage(current: ProductImageItem[], uid: string): ProductImageItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 卸载时释放全部 object URL */
export function revokeProductImageUrls(items: ProductImageItem[]): void {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

/**
 * 将选择的资料追加为本地项；超出上限的部分丢弃。
 */
export function appendProductDocs(current: ProductDocItem[], files: File[]): ProductDocItem[] {
  const room = MAX_PRODUCT_DOCS - current.length;
  if (room <= 0) return current;
  const next = files.slice(0, room).map((file) => ({
    uid: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  }));
  return [...current, ...next];
}

/** 按 uid 移除资料并释放 object URL */
export function removeProductDoc(current: ProductDocItem[], uid: string): ProductDocItem[] {
  const target = current.find((item) => item.uid === uid);
  if (target) URL.revokeObjectURL(target.previewUrl);
  return current.filter((item) => item.uid !== uid);
}

/** 卸载时释放资料 object URL */
export function revokeProductDocUrls(items: ProductDocItem[]): void {
  for (const item of items) {
    URL.revokeObjectURL(item.previewUrl);
  }
}

/** 把本地文件读成 data URL，供 JSON 入参 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

/** 是否为用户主动中止 */
export function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

/** 产品多视角请求体：本步表单 + 产品图 */
export async function toProductViewGeneratePayload(
  form: ProductViewFormState,
  images: ProductImageItem[],
): Promise<EcommerceGenerateRequest> {
  return {
    kind: 'productView',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    images: await toAnalyzeImages(images),
  };
}

/** 营销主视觉请求体：表单规格 + 商业分析 + 选中产品多视角图 */
export function toVisualGeneratePayload(
  form: StudioFormState,
  analysisText: string,
  productViewDataUrl: string,
): EcommerceGenerateRequest {
  return {
    kind: 'visual',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    analysisText: analysisText.trim(),
    productViewDataUrl,
  };
}

/** 产品模特请求体：本步表单 + 选中主视觉 + 可选模特形象 */
export async function toModelGeneratePayload(
  form: ModelFormState,
  modelImages: ProductImageItem[],
  visualDataUrl: string,
): Promise<EcommerceGenerateRequest> {
  return {
    kind: 'model',
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
    modelRequirement: form.modelRequirement,
    visualDataUrl,
    ...(modelImages.length > 0 ? { modelImages: await toAnalyzeImages(modelImages) } : {}),
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

/** 模特要求帮写请求体 */
export async function toModelHelpWritePayload(input: {
  analysisText: string;
  visualDataUrl: string;
  portraits: ProductImageItem[];
}): Promise<{
  analysisText: string;
  visualDataUrl: string;
  modelImageDataUrl?: string;
}> {
  const first = input.portraits[0];
  const modelImageDataUrl = first ? await readFileAsDataUrl(first.file) : undefined;
  return {
    analysisText: input.analysisText.trim(),
    visualDataUrl: input.visualDataUrl,
    ...(modelImageDataUrl ? { modelImageDataUrl } : {}),
  };
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
      filename: item.file.name,
      mediaType: item.file.type || 'image/jpeg',
      dataUrl: await readFileAsDataUrl(item.file),
    })),
  );
}

/** 本地资料转分析接口 documents 字段 */
export async function toAnalyzeDocuments(
  documents: ProductDocItem[],
): Promise<EcommerceDocumentInput[]> {
  return Promise.all(
    documents.map(async (item) => ({
      filename: item.file.name,
      mediaType: toDocMediaType(item.file),
      dataUrl: await readFileAsDataUrl(item.file),
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

/** 按生图事件更新网格项 */
export function applyGenerateEvent(
  current: StudioResultImage[],
  event: EcommerceGenerateImageEvent,
): StudioResultImage[] {
  return current.map((item) => {
    if (item.index !== event.index) return item;
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

/** 按张数铺 pending 网格 */
export function pendingImagesFromCount(count: number): StudioResultImage[] {
  const total = Math.max(1, count);
  return Array.from({ length: total }, (_, index) => ({
    index,
    status: 'pending' as const,
  }));
}

/** 上一步：生图中取消回本步空闲，产品多视角回分析完成，视觉回产品多视角，模特回视觉，完成回模特 */
export function phaseAfterPrev(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzing') return 'input';
  if (phase === 'productView' || phase === 'productViewGenerating') return 'analyzed';
  if (phase === 'visual' || phase === 'visualGenerating') return 'productView';
  if (phase === 'model' || phase === 'modelGenerating') return 'visual';
  if (phase === 'done') return 'model';
  return phase;
}

/** 下一步：分析完成进产品多视角；产品多视角进视觉；视觉进模特；模特进完成 */
export function phaseAfterNext(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzed') return 'productView';
  if (phase === 'productView') return 'visual';
  if (phase === 'visual') return 'model';
  if (phase === 'model') return 'done';
  return phase;
}
