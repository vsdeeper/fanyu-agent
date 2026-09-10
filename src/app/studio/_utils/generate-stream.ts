import type { StudioGenerateImageEvent } from '@/app/api/studio/_shared/generate-types';
import { ApiClientError } from '@/lib/shared/client/api-client';
import type { StudioResultImage } from './result-images';

/** 去掉尚未完成的占位图，保留已成功或失败的结果。 */
export function dropPendingImages<T extends StudioResultImage>(images: readonly T[]): T[] {
  return images.filter((item) => item.status !== 'pending');
}

/** 为一批待生成图片建立占位状态；id 在这里生成，此后身份不再变化。 */
export function pendingImages(count: number, aspectRatio: string): StudioResultImage[] {
  return Array.from({ length: Math.max(1, count) }, () => ({
    id: crypto.randomUUID(),
    aspectRatio,
    status: 'pending',
  }));
}

/** 将单条流事件合并到对应槽位；事件按槽位 id 寻址，不做任何下标偏移。 */
export function applyGenerateEvent<T extends StudioResultImage>(
  current: T[],
  event: StudioGenerateImageEvent,
): T[] {
  return current.map((item) =>
    item.id !== event.slotId
      ? item
      : event.error
        ? { ...item, status: 'failed', error: event.error }
        : { ...item, status: 'ready', url: event.url },
  );
}

/** 读取 NDJSON 生图响应并逐条回调。 */
export async function consumeGenerateNdjson(
  response: Response,
  onEvent: (event: StudioGenerateImageEvent) => void,
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
      if (line.trim()) onEvent(JSON.parse(line) as StudioGenerateImageEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as StudioGenerateImageEvent);
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

/** 判断异常是否由主动中止请求产生。 */
export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === 'AbortError') ||
    (error instanceof Error && error.name === 'AbortError')
  );
}
