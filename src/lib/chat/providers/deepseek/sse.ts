/**
 * 修复：DeepSeek Responses API 的 SSE 事件类型名与 OpenAI 不完全一致，
 * @ai-sdk/openai 的 chunk schema 不匹配 → unknown_chunk → 静默丢弃。
 * 在此归一化翻译为 OpenAI 标准事件名，供 SDK 流式路径产出 reasoning / tool-call / source-url。
 *
 * 翻译规则（基于 DeepSeek API 官方文档）：
 *   response.reasoning_text.delta  → response.reasoning_summary_text.delta
 *   response.reasoning_text.done   → response.reasoning_summary_part.done
 *   response.web_search_call.in_progress → response.output_item.added（web_search_call）
 *   response.web_search_call.completed    → response.output_item.done（web_search_call + action/sources）
 */

type DeepSeekSseEvent = {
  type?: string;
  item_id?: string;
  output_index?: number;
  delta?: string;
  text?: string;
  item?: {
    type?: string;
    id?: string;
    status?: string;
    action?: unknown;
    sources?: unknown[];
  };
  call_id?: string;
  sequence_number?: number;
  [key: string]: unknown;
};

const SSE_EVENT_SEP = /\r?\n\r?\n/;

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
 * 将单条 SSE data JSON 归一为 0..n 条 SSE 文本。
 * - reasoning_text.delta/done → reasoning_summary_text.delta / reasoning_summary_part.done
 * - web_search_call.* → output_item.added / output_item.done
 *
 * 跟踪 activeReasoningItemId：从本 normalize 翻译的 output_item.added(reasoning) 中提取 id，
 * 用于后续 reasoning_text.delta/done 时的 item_id 回填。
 */
export function normalizeDeepseekSseEventJson(
  raw: string,
  state: { activeReasoningItemId?: string; webSearchOutputIndex: number },
): string[] {
  let event: DeepSeekSseEvent;
  try {
    event = JSON.parse(raw) as DeepSeekSseEvent;
  } catch {
    return [`data: ${raw}\n\n`];
  }

  const out: string[] = [];

  switch (event.type) {
    // 修复：DeepSeek reasoning_text.delta → OpenAI reasoning_summary_text.delta
    case 'response.reasoning_text.delta': {
      const itemId = event.item_id ?? state.activeReasoningItemId ?? 'reasoning_0';
      out.push(
        formatSseData({
          type: 'response.reasoning_summary_text.delta',
          item_id: itemId,
          summary_index: 0,
          delta: event.delta ?? '',
        }),
      );
      break;
    }

    // 修复：DeepSeek reasoning_text.done → OpenAI reasoning_summary_part.done
    case 'response.reasoning_text.done': {
      const itemId = event.item_id ?? state.activeReasoningItemId ?? 'reasoning_0';
      out.push(
        formatSseData({
          type: 'response.reasoning_summary_part.done',
          item_id: itemId,
          summary_index: 0,
        }),
      );
      break;
    }

    // 修复：DeepSeek web_search_call.in_progress → OpenAI output_item.added
    case 'response.web_search_call.in_progress': {
      const idx = state.webSearchOutputIndex++;
      const itemId = event.item_id ?? `ws_${idx}`;
      out.push(
        formatSseData({
          type: 'response.output_item.added',
          output_index: idx,
          item: {
            type: 'web_search_call',
            id: itemId,
            status: 'in_progress',
          },
        }),
      );
      break;
    }

    // 修复：DeepSeek web_search_call.completed → OpenAI output_item.done
    case 'response.web_search_call.completed': {
      const idx = state.webSearchOutputIndex - 1;
      const itemId = event.item_id ?? `ws_${Math.max(idx, 0)}`;
      const item: Record<string, unknown> = {
        type: 'web_search_call',
        id: itemId,
        status: 'completed',
      };
      // 透传 action（搜索查询等）和 sources（搜索结果）
      if (event.item?.action != null) item.action = event.item.action;
      if (event.item?.sources != null) item.sources = event.item.sources;
      out.push(
        formatSseData({
          type: 'response.output_item.done',
          output_index: Math.max(idx, 0),
          item,
        }),
      );
      break;
    }

    // 修复：跟踪 reasoning output_item.added 以获取 item_id
    case 'response.output_item.added': {
      if (event.item?.type === 'reasoning' && event.item.id) {
        state.activeReasoningItemId = event.item.id;
      }
      out.push(formatSseData(event));
      break;
    }

    // 透传所有其他事件
    default:
      out.push(formatSseData(event));
      break;
  }

  return out;
}

function processSseBlock(
  block: string,
  state: { activeReasoningItemId?: string; webSearchOutputIndex: number },
  enqueueText: (text: string) => void,
): void {
  const payload = extractDataPayload(block);
  if (payload == null) {
    enqueueText(`${block}\n\n`);
    return;
  }
  for (const chunk of normalizeDeepseekSseEventJson(payload, state)) {
    enqueueText(chunk);
  }
}

/** 标准 TransformStream：按 SSE 事件边界切包并归一化 DeepSeek → OpenAI 事件 */
export function createDeepseekSseNormalizeTransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const state = {
    activeReasoningItemId: undefined as string | undefined,
    webSearchOutputIndex: 0,
  };

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

          processSseBlock(block, state, (text) => {
            controller.enqueue(encoder.encode(text));
          });
        }
      } catch (error) {
        controller.error(error);
      }
    },
    flush(controller) {
      try {
        buffer += decoder.decode();

        if (buffer.trim()) {
          processSseBlock(buffer, state, (text) => {
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
 * 包装 DeepSeek SSE Response：归一化 reasoning + web_search 事件为 OpenAI 标准事件名。
 */
export function normalizeDeepseekSse(response: Response): Response {
  if (!response.body) return response;

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/event-stream')) {
    return response;
  }

  return new Response(response.body.pipeThrough(createDeepseekSseNormalizeTransform()), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
