import 'server-only';

const encoder = new TextEncoder();

/** 写入一条 SSE 事件（event + JSON data） */
export function encodeSseEvent(event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** 写入一行 NDJSON */
export function encodeNdjsonLine(data: unknown): Uint8Array {
  return encoder.encode(`${JSON.stringify(data)}\n`);
}

/**
 * Safari/部分代理会攒满约 1KB 才开始渲染流。SSE 注释行客户端会忽略。
 */
export function encodeSsePrelude(): Uint8Array {
  return encoder.encode(`:${' '.repeat(2048)}\n\n`);
}

export const SSE_STREAM_HEADERS: HeadersInit = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

export const NDJSON_STREAM_HEADERS: HeadersInit = {
  'Content-Type': 'application/x-ndjson; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  'X-Accel-Buffering': 'no',
};

type StreamWrite = (chunk: Uint8Array) => Promise<void>;

/**
 * 立刻返回可推送的 Response，后台再往流里写。
 * 不用 async ReadableStream.start：它返回的 Promise 会被 Next.js 等到结束才把 body 交给客户端。
 */
export function createPushStreamResponse(
  headers: HeadersInit,
  run: (write: StreamWrite) => Promise<void>,
  prelude?: Uint8Array,
): Response {
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>();
  const writer = writable.getWriter();

  void (async () => {
    try {
      if (prelude) {
        await writer.write(prelude);
      }
      await run((chunk) => writer.write(chunk));
    } catch {
      /* 客户端断开或写入失败 */
    } finally {
      try {
        await writer.close();
      } catch {
        /* 已关闭 */
      }
    }
  })();

  return new Response(readable, { headers });
}
