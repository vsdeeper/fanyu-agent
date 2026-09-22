/**
 * 方舟 Responses 入站归一化：
 * - SSE：注入/补全 annotation.added（见 createArkSseNormalizeTransform）
 * - JSON（generateText 非流式）：补全 output_text.annotations=[]，否则 @ai-sdk/openai Zod 报 Invalid JSON
 */

type UrlCitation = {
  type: 'url_citation';
  url: string;
  title: string;
  start_index: number;
  end_index: number;
};

type ContentPart = {
  type?: string;
  annotations?: Array<{
    type?: string;
    url?: string;
    title?: string;
    start_index?: number;
    end_index?: number;
  }>;
};

type ArkSseEvent = {
  type?: string;
  annotation?: {
    type?: string;
    url?: string;
    title?: string;
    start_index?: number;
    end_index?: number;
  };
  item?: {
    type?: string;
    id?: string;
    content?: ContentPart[];
  };
  response?: {
    output?: Array<{
      type?: string;
      content?: ContentPart[];
    }>;
  };
  [key: string]: unknown;
};

const SSE_EVENT_SEP = /\r?\n\r?\n/;

function normalizeUrlCitation(ann: {
  url: string;
  title?: string;
  start_index?: number;
  end_index?: number;
}): UrlCitation {
  return {
    type: 'url_citation',
    url: ann.url,
    title: ann.title || ann.url,
    start_index: typeof ann.start_index === 'number' ? ann.start_index : 0,
    end_index: typeof ann.end_index === 'number' ? ann.end_index : 0,
  };
}

function collectUrlCitations(content: ContentPart[] | undefined): UrlCitation[] {
  if (!Array.isArray(content)) return [];
  const citations: UrlCitation[] = [];
  for (const part of content) {
    if (!Array.isArray(part.annotations)) continue;
    for (const ann of part.annotations) {
      if (ann?.type === 'url_citation' && typeof ann.url === 'string' && ann.url) {
        citations.push(
          normalizeUrlCitation({
            url: ann.url,
            title: ann.title,
            start_index: ann.start_index,
            end_index: ann.end_index,
          }),
        );
      }
    }
  }
  return citations;
}

function formatSseData(event: unknown): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function extractDataPayload(block: string): string | null {
  const lines = block.split(/\r?\n/);
  const dataLines: string[] = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (dataLines.length === 0) return null;
  return dataLines.join('\n');
}

/**
 * 将单条 SSE data JSON 归一为 0..n 条 SSE 文本（注入 annotation.added）。
 * @param seenUrls 跨事件去重，避免 done + completed 重复注入
 */
export function normalizeArkSseEventJson(raw: string, seenUrls: Set<string>): string[] {
  let event: ArkSseEvent;
  try {
    event = JSON.parse(raw) as ArkSseEvent;
  } catch {
    return [`data: ${raw}\n\n`];
  }

  const pushCitation = (citation: UrlCitation, into: string[]) => {
    if (seenUrls.has(citation.url)) return;
    seenUrls.add(citation.url);
    into.push(
      formatSseData({
        type: 'response.output_text.annotation.added',
        annotation: citation,
      }),
    );
  };

  const out: string[] = [];

  // 修复：方舟 annotation.added 常缺 start_index/end_index，Zod 失败会变 unknown_chunk
  if (event.type === 'response.output_text.annotation.added' && event.annotation) {
    const ann = event.annotation;
    if (ann.type === 'url_citation' && typeof ann.url === 'string' && ann.url) {
      const citation = normalizeUrlCitation({
        url: ann.url,
        title: ann.title,
        start_index: ann.start_index,
        end_index: ann.end_index,
      });
      if (!seenUrls.has(citation.url)) {
        seenUrls.add(citation.url);
      }
      out.push(
        formatSseData({
          ...event,
          annotation: citation,
        }),
      );
      return out;
    }
  }

  if (event.type === 'response.output_item.done' && event.item?.type === 'message') {
    for (const citation of collectUrlCitations(event.item.content)) {
      pushCitation(citation, out);
    }
    out.push(formatSseData(event));
    return out;
  }

  if (
    (event.type === 'response.completed' || event.type === 'response.incomplete') &&
    Array.isArray(event.response?.output)
  ) {
    for (const item of event.response.output) {
      if (item.type !== 'message') continue;
      for (const citation of collectUrlCitations(item.content)) {
        pushCitation(citation, out);
      }
    }
    out.push(formatSseData(event));
    return out;
  }

  out.push(formatSseData(event));
  return out;
}

function processSseBlock(
  block: string,
  seenUrls: Set<string>,
  enqueueText: (text: string) => void,
): void {
  const payload = extractDataPayload(block);
  if (payload == null) {
    enqueueText(`${block}\n\n`);
    return;
  }
  if (payload === '[DONE]') {
    enqueueText('data: [DONE]\n\n');
    return;
  }
  for (const chunk of normalizeArkSseEventJson(payload, seenUrls)) {
    enqueueText(chunk);
  }
}

/** 标准 TransformStream：按 SSE 事件边界切包并注入 annotation.added */
export function createArkSseNormalizeTransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const seenUrls = new Set<string>();

  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      try {
        buffer += decoder.decode(chunk, { stream: true });

        while (true) {
          const match = buffer.match(SSE_EVENT_SEP);
          if (!match || match.index === undefined) break;

          const sepIndex = match.index;
          const sepLength = match[0].length;
          const block = buffer.slice(0, sepIndex);
          buffer = buffer.slice(sepIndex + sepLength);

          processSseBlock(block, seenUrls, (text) => {
            controller.enqueue(encoder.encode(text));
          });
        }
      } catch (error) {
        controller.error(error);
      }
    },
    flush(controller) {
      try {
        // 冲掉 decoder 尾部
        buffer += decoder.decode();

        if (buffer.trim()) {
          processSseBlock(buffer, seenUrls, (text) => {
            controller.enqueue(encoder.encode(text));
          });
        }
        buffer = '';
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * 修复：方舟非流式 Responses 常省略 content[].annotations，
 * @ai-sdk/openai 校验要求 array → Invalid JSON / Zod invalid_type。
 * 缺省时补 []，不改动已有 annotations。
 */
export function normalizeArkResponseJsonBody(text: string): string {
  let body: {
    output?: Array<{ content?: Array<{ annotations?: unknown } & Record<string, unknown>> }>;
  };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return text;
  }
  if (!Array.isArray(body.output)) return text;

  let patched = false;
  for (const item of body.output) {
    if (!Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part && typeof part === 'object' && !Array.isArray(part.annotations)) {
        part.annotations = [];
        patched = true;
      }
    }
  }
  return patched ? JSON.stringify(body) : text;
}

/** 包装方舟 SSE Response：注入/补全 annotation.added，供 AI SDK 产出 source-url。 */
export function normalizeArkResponsesSse(response: Response): Response {
  if (!response.body) return response;

  const contentType = response.headers.get('content-type') ?? '';
  // 仅处理真正的 SSE，避免误伤 text/plain 等非流式响应
  if (!contentType.includes('text/event-stream')) {
    return response;
  }

  return new Response(response.body.pipeThrough(createArkSseNormalizeTransform()), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * 入站统一归一：SSE 走注解注入；JSON 走 annotations=[] 补全（analyze_image / generateText）。
 */
export async function normalizeArkResponse(response: Response): Promise<Response> {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('text/event-stream')) {
    return normalizeArkResponsesSse(response);
  }

  if (contentType.includes('application/json') && response.ok) {
    const text = await response.text();
    const normalized = normalizeArkResponseJsonBody(text);
    if (normalized === text) {
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(normalized, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}
