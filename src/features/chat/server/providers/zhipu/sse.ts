/**
 * 智谱 SSE 入站归一化（仅 Chat Completions chunk 流）：
 * thinking 映射：delta.reasoning_content → <think> 标签包裹的 content 文本
 * （@ai-sdk/openai chat 路径不识别 reasoning_content，Zod 静默剥离导致 Think 丢失；
 *  运行时侧以 extractReasoningMiddleware({tagName:'think'}) 提取回 reasoning part）
 *
 * 联网检索改由本地 web_search 工具调独立 API（见 web-search.ts），内置搜索与
 * function 工具互斥不会触发，故这里不再解析智谱消息附加的搜索结果字段；
 * 来源经 stream-chat 的 web-search-source-bridge 在 ai 层合成 source part。
 */

type ZhipuDelta = {
  role?: string;
  content?: string | null;
  reasoning_content?: string | null;
};

type ZhipuChoice = {
  index?: number;
  finish_reason?: string | null;
  delta?: ZhipuDelta | null;
};

type ZhipuSseEvent = {
  choices?: ZhipuChoice[];
  [key: string]: unknown;
};

const SSE_EVENT_SEP = /\r?\n\r?\n/;

/**
 * <think> 标签状态机：idle --思考--> thinking --正文--> answer，可循环往复。
 * 勿在事件间复用同一实例外的状态——闭包内按流维护。
 */
export type ThinkTagState = {
  phase: 'idle' | 'thinking' | 'answer';
};

/**
 * 将单条 SSE data JSON 归一为 0..n 条 SSE 文本。
 * @param thinkState <think> 开合状态机（跨事件延续）
 */
export function normalizeZhipuSseEventJson(raw: string, thinkState: ThinkTagState): string[] {
  let event: ZhipuSseEvent;
  try {
    event = JSON.parse(raw) as ZhipuSseEvent;
  } catch {
    return [`data: ${raw}\n\n`];
  }

  const out: string[] = [];
  const formatSseData = (payload: unknown) => out.push(`data: ${JSON.stringify(payload)}\n\n`);

  // ---- thinking 映射为 <think> 标签文本 ----
  const choice = event.choices?.[0];
  const delta = choice?.delta;
  if (delta) {
    const reasoningText =
      typeof delta.reasoning_content === 'string' ? delta.reasoning_content : '';
    const contentText = typeof delta.content === 'string' ? delta.content : '';

    if (reasoningText) {
      const openPrefix =
        thinkState.phase === 'thinking'
          ? ''
          : `${thinkState.phase === 'answer' ? '</think>' : ''}<think>`;
      thinkState.phase = 'thinking';
      delete delta.reasoning_content;
      delta.content = `${openPrefix}${reasoningText}${contentText ? `</think>${contentText}` : ''}`;
      if (contentText) {
        thinkState.phase = 'answer';
      }
    } else if (contentText && thinkState.phase === 'thinking') {
      thinkState.phase = 'answer';
      delta.content = `</think>${contentText}`;
    } else if (!contentText) {
      delete delta.content; // undefined/null 的 content 键无意义，剥掉防误判
    }
    delete delta.reasoning_content;

    // 思考未闭合就收到 finish_reason（异常收尾）：补一条闭标签事件，防止标签吞掉后续轮次文本
    if (choice?.finish_reason && thinkState.phase === 'thinking') {
      thinkState.phase = 'answer';
      formatSseData({
        choices: [{ index: 0, finish_reason: null, delta: { content: '</think>' } }],
      });
    }
  }

  formatSseData(event);
  return out;
}

function processSseBlock(
  block: string,
  thinkState: ThinkTagState,
  enqueueText: (text: string) => void,
): void {
  const dataLines: string[] = [];
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''));
    }
  }

  if (dataLines.length === 0) {
    enqueueText(`${block}\n\n`);
    return;
  }
  if (dataLines[0] === '[DONE]') {
    enqueueText('data: [DONE]\n\n');
    return;
  }

  for (const payload of dataLines) {
    for (const text of normalizeZhipuSseEventJson(payload, thinkState)) {
      enqueueText(text);
    }
  }
}

/** 标准 TransformStream：按 SSE 事件边界切包并执行智谱归一化 */
export function createZhipuSseNormalizeTransform(): TransformStream<Uint8Array, Uint8Array> {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const thinkState: ThinkTagState = { phase: 'idle' };

  const enqueue = (controller: TransformStreamDefaultController<Uint8Array>) => (text: string) => {
    controller.enqueue(encoder.encode(text));
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

          processSseBlock(block, thinkState, enqueue(controller));
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
          processSseBlock(buffer, thinkState, enqueue(controller));
        }
        // 流结束时思考仍未闭合：补闭标签兜底
        if (thinkState.phase === 'thinking') {
          thinkState.phase = 'answer';
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                choices: [{ index: 0, finish_reason: null, delta: { content: '</think>' } }],
              })}\n\n`,
            ),
          );
        }
        buffer = '';
      } catch (error) {
        controller.error(error);
      }
    },
  });
}

/**
 * 包装智谱 SSE Response：<think> 标签重写，供 AI SDK 消费；
 * 非 text/event-stream 响应原样返回。
 */
export function normalizeZhipuSse(response: Response): Response {
  if (!response.body) return response;

  const contentType = response.headers.get('content-type') ?? '';
  // 仅处理真正的 SSE，避免误伤 text/plain 等非流式响应
  if (!contentType.includes('text/event-stream')) {
    return response;
  }

  return new Response(response.body.pipeThrough(createZhipuSseNormalizeTransform()), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
