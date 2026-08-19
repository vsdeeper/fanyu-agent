import type { ModelMessage } from 'ai';

import type { DeepSeekInputItem, DeepSeekRequestBody } from './request-patch';

/** 夹在 instructions / system 里的一次性载荷；出站 fetch 解析后立即剥离，模型看不到 */
const PASSBACK_PREFIX = '\n\n[[DS_REASONING_PASSBACK]]';
const PASSBACK_SUFFIX = '[[/DS_REASONING_PASSBACK]]';

/**
 * 从模型消息中抽出 assistant 的 reasoning 文本（保持出现顺序）。
 * 供 DeepSeek 思考模式在后续请求（含继续生成、带 tools 的多轮）回传 reasoning_text。
 */
export function extractReasoningTexts(messages: ModelMessage[]): string[] {
  const texts: string[] = [];

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.content)) continue;

    for (const part of message.content) {
      if (part.type === 'reasoning' && part.text) {
        texts.push(part.text);
      }
    }
  }

  return texts;
}

/**
 * 把 reasoning 文本编码进 instructions。
 * SDK 在 store:false 时会丢掉无 encrypted_content 的 reasoning，无法走正常 input 回传；
 * 编码进 instructions 后由出站 fetch 再还原成 DeepSeek reasoning item。
 */
export function encodeReasoningPassback(instructions: string, texts: string[]): string {
  if (texts.length === 0) return instructions;
  const payload = Buffer.from(JSON.stringify(texts), 'utf8').toString('base64');
  return `${instructions}${PASSBACK_PREFIX}${payload}${PASSBACK_SUFFIX}`;
}

/**
 * 从一段文本中取出 passback 载荷并剥掉标记。
 * 无标记时原样返回；载荷损坏则只剥离标记、不注入。
 */
function takePassbackFromText(text: string): { text: string; texts: string[] | null } {
  const start = text.indexOf(PASSBACK_PREFIX);
  if (start < 0) return { text, texts: null };

  const payloadStart = start + PASSBACK_PREFIX.length;
  const end = text.indexOf(PASSBACK_SUFFIX, payloadStart);
  if (end < 0) return { text, texts: null };

  const payload = text.slice(payloadStart, end);
  const nextText = `${text.slice(0, start)}${text.slice(end + PASSBACK_SUFFIX.length)}`;

  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== 'string')) {
      return { text: nextText, texts: null };
    }
    return { text: nextText, texts: parsed };
  } catch {
    return { text: nextText, texts: null };
  }
}

/** 从 instructions 或 system input 取出 passback，并写回剥离后的文本 */
function extractPassbackTexts(body: DeepSeekRequestBody): string[] | null {
  if (typeof body.instructions === 'string') {
    const taken = takePassbackFromText(body.instructions);
    if (taken.texts || taken.text !== body.instructions) {
      body.instructions = taken.text;
      if (taken.texts) return taken.texts;
    }
  }

  if (!Array.isArray(body.input)) return null;

  for (const item of body.input) {
    if (item.role !== 'system') continue;

    if (typeof item.content === 'string') {
      const taken = takePassbackFromText(item.content);
      if (taken.texts || taken.text !== item.content) {
        item.content = taken.text;
        if (taken.texts) return taken.texts;
      }
      continue;
    }

    if (!Array.isArray(item.content)) continue;

    for (const part of item.content) {
      if (!part || typeof part !== 'object') continue;
      const rec = part as { type?: string; text?: string };
      if (rec.type !== 'input_text' && rec.type !== 'output_text') continue;
      if (typeof rec.text !== 'string') continue;
      const taken = takePassbackFromText(rec.text);
      if (taken.texts || taken.text !== rec.text) {
        rec.text = taken.text;
        if (taken.texts) return taken.texts;
      }
    }
  }

  return null;
}

function hasReasoningText(input: DeepSeekInputItem[]): boolean {
  return input.some((item) => {
    if (item.type !== 'reasoning' || !Array.isArray(item.content)) return false;
    return item.content.some(
      (part) =>
        part && typeof part === 'object' && (part as { type?: string }).type === 'reasoning_text',
    );
  });
}

function findLastAssistantIndex(input: DeepSeekInputItem[]): number {
  for (let index = input.length - 1; index >= 0; index -= 1) {
    if (input[index]?.role === 'assistant') return index;
  }
  return -1;
}

/**
 * 把 OpenAI 的 reasoning.summary / summary_text 改写成 DeepSeek 的 content / reasoning_text。
 * DeepSeek Responses 只认 reasoning_text，不认 summary。
 */
function rewriteOpenAIReasoningItems(input: DeepSeekInputItem[]): boolean {
  let patched = false;

  for (const item of input) {
    if (item.type !== 'reasoning') continue;

    const summary = item.summary;
    if (!Array.isArray(summary)) continue;

    const texts = summary
      .map((part) => {
        if (!part || typeof part !== 'object') return null;
        const rec = part as { type?: string; text?: string };
        if (rec.type !== 'summary_text' || typeof rec.text !== 'string' || !rec.text) return null;
        return rec.text;
      })
      .filter((text): text is string => text != null);

    if (texts.length === 0) continue;

    item.content = texts.map((text) => ({ type: 'reasoning_text', text }));
    delete item.summary;
    delete item.encrypted_content;
    patched = true;
  }

  return patched;
}

/**
 * 出站时把思考内容还原为 DeepSeek reasoning item（content[].type = reasoning_text）。
 * 原现象：继续生成 / 带 tools 多轮时 API 报 reasoning_text must be passed back。
 * 根因：pruneMessages 去掉 reasoning，且 store:false 时 SDK 丢弃无 encrypted_content 的 reasoning。
 * 勿改回只 prune 不回传。
 */
export function applyReasoningPassback(body: DeepSeekRequestBody): boolean {
  let patched = false;
  const texts = extractPassbackTexts(body);
  if (texts) patched = true;

  if (Array.isArray(body.input) && rewriteOpenAIReasoningItems(body.input)) {
    patched = true;
  }

  if (!texts?.length || !Array.isArray(body.input) || hasReasoningText(body.input)) {
    return patched;
  }

  const reasoningItem: DeepSeekInputItem = {
    type: 'reasoning',
    content: texts.map((text) => ({ type: 'reasoning_text', text })),
  };

  const assistantIndex = findLastAssistantIndex(body.input);
  if (assistantIndex >= 0) {
    body.input.splice(assistantIndex, 0, reasoningItem);
  } else {
    body.input.push(reasoningItem);
  }

  return true;
}
