/**
 * DeepSeek Responses API 的 SSE 事件类型名与 OpenAI 不完全一致，
 * @ai-sdk/openai 的 chunk schema 不匹配 → unknown_chunk → 静默丢弃。
 * 在此归一化翻译 reasoning 事件名，供 SDK 流式路径产出 reasoning / tool-call。
 *
 * 翻译规则（基于 DeepSeek API 官方文档）：
 *   response.reasoning_text.delta  → response.reasoning_summary_text.delta
 *   response.reasoning_text.done   → response.reasoning_summary_part.done
 *
 * 修复：来源提取不依赖 SSE annotation。DeepSeek 不支持 include → action.sources 始终为空，
 * url_citation 注解事件亦不下发；此前保留的 annotation.added 透传 + seenUrls 去重是死代码
 * （去重逻辑「只 add 不判断」实际未生效），已整体删除。来源统一走 prompt 引导模型在回答中
 * 列出 Markdown 链接（见 stream-chat.ts instructions），前端 getSourceItems 正则路径兜底。
 */

type DeepSeekSseEvent = {
  type?: string;
  item_id?: string;
  delta?: string;
  item?: {
    type?: string;
    id?: string;
  };
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
 *
 * 跟踪 activeReasoningItemId：从 output_item.added(reasoning) 中提取 id，
 * 用于后续 reasoning_text.delta/done 时的 item_id 回填。
 */
export function normalizeDeepseekSseEventJson(
  raw: string,
  state: {
    activeReasoningItemId?: string;
  },
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

    // 修复：跟踪 reasoning output_item.added 以获取 item_id
    case 'response.output_item.added': {
      if (event.item?.type === 'reasoning' && event.item.id) {
        state.activeReasoningItemId = event.item.id;
      }
      out.push(formatSseData(event));
      break;
    }

    // 透传 output_item.done（不合成 annotation 注入；DeepSeek 来源依赖 prompt 引导 +
    // getSourceItems Markdown 正则路径，SSE 注入的 URL 缺标题反而产生噪音）
    case 'response.output_item.done': {
      out.push(formatSseData(event));
      break;
    }

    // 透传 response.completed / incomplete，不合成 annotation 注入
    case 'response.completed':
    case 'response.incomplete': {
      out.push(formatSseData(event));
      break;
    }

    // 透传所有其他事件（包括 web_search_call.* 等 DeepSeek 专有事件，
    // SDK Zod schema 不匹配 → unknown_chunk → 静默丢弃，无副作用）
    default:
      out.push(formatSseData(event));
      break;
  }

  return out;
}

function processSseBlock(
  block: string,
  state: {
    activeReasoningItemId?: string;
  },
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
 * 包装 DeepSeek SSE Response：归一化 reasoning 事件名。
 * 不合成 / 不透传 annotation.added（来源依赖 prompt 引导 + 前端 Markdown 正则提取）。
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
