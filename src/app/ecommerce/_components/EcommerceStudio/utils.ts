import { ANALYZE_SSE_EVENT } from '@/app/api/ecommerce/_shared/constants';
import type {
  EcommerceAnalyzeErrorEvent,
  EcommerceAnalyzeRequest,
  EcommerceAnalyzeTextEvent,
  EcommerceDocumentInput,
  EcommerceGenerateImageEvent,
  EcommerceGenerateRequest,
  EcommerceImageInput,
  EcommercePlanSlot,
  EcommerceStudioFormInput,
} from '@/app/api/ecommerce/_shared/types';
import { ApiClientError } from '@/lib/shared/client/api-client';
import { MAX_PRODUCT_DOCS, MAX_PRODUCT_IMAGES } from './constants';
import type {
  ProductDocItem,
  ProductImageItem,
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

/** 出图表单转生图接口字段 */
export function toStudioFormPayload(form: StudioFormState): EcommerceStudioFormInput {
  return {
    designType: form.designType,
    platform: form.platform,
    requirement: form.requirement,
    language: form.language,
    model: form.model,
    aspectRatio: form.aspectRatio,
    quality: form.quality,
    clarity: form.clarity,
    count: Number.parseInt(form.count, 10) || 1,
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

/** 组装生图请求体：产品图随请求传入，不引用落盘资产 */
export async function toGeneratePayload(
  form: StudioFormState,
  images: ProductImageItem[],
  slots: EcommercePlanSlot[],
): Promise<EcommerceGenerateRequest> {
  return {
    ...toStudioFormPayload(form),
    images: await toAnalyzeImages(images),
    slots,
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

/** 按 slots 铺 pending 网格（index 与 slot.index 对齐） */
export function pendingImagesFromSlots(slots: EcommercePlanSlot[]): StudioResultImage[] {
  return slots.map((slot) => ({
    index: slot.index,
    status: 'pending' as const,
  }));
}

/** 上一步：生成中取消回确认规划，确认规划回分析完成，完成回规划 */
export function phaseAfterPrev(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzing') return 'input';
  if (phase === 'confirm') return 'analyzed';
  if (phase === 'generating' || phase === 'done') return 'confirm';
  return phase;
}

/** 下一步：分析完成后进入确认规划；确认规划由调用方触发出图 */
export function phaseAfterNext(phase: StudioPhase): StudioPhase {
  if (phase === 'analyzed') return 'confirm';
  return phase;
}
