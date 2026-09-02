import 'server-only';

import type { EcommercePlanSlot } from '@/app/api/ecommerce/_shared/types';
import { parsePlanSlots } from './parse-request';

export const SLOTS_FENCE = '```json';

/**
 * 把已累积正文拆成可展示前缀与需暂扣的尾部，避免 slots 的 JSON 围栏闪进 Markdown。
 */
export function splitVisibleMarkdown(accumulated: string): { visible: string; hold: string } {
  const idx = accumulated.indexOf(SLOTS_FENCE);
  if (idx >= 0) {
    return { visible: accumulated.slice(0, idx).replace(/\s+$/, ''), hold: accumulated.slice(idx) };
  }

  const maxHold = SLOTS_FENCE.length + 1;
  const suffix = accumulated.slice(-maxHold);
  for (let length = suffix.length; length > 0; length--) {
    const piece = suffix.slice(-length);
    if (SLOTS_FENCE.startsWith(piece) || `\n${SLOTS_FENCE}`.startsWith(piece)) {
      return {
        visible: accumulated.slice(0, accumulated.length - length),
        hold: piece,
      };
    }
  }
  return { visible: accumulated, hold: '' };
}

function extractJsonValue(text: string): unknown {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = fenceMatch?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf('{');
  const startArr = raw.indexOf('[');
  let jsonText = raw;
  if (start >= 0 && (startArr < 0 || start < startArr)) {
    const end = raw.lastIndexOf('}');
    if (end > start) jsonText = raw.slice(start, end + 1);
  } else if (startArr >= 0) {
    const end = raw.lastIndexOf(']');
    if (end > startArr) jsonText = raw.slice(startArr, end + 1);
  }
  return JSON.parse(jsonText) as unknown;
}

/**
 * 从模型全文末尾的 JSON 围栏解析 slots；失败返回 null。
 */
export function parseSlotsFromModelText(fullText: string): EcommercePlanSlot[] | null {
  const fenceIdx = fullText.indexOf(SLOTS_FENCE);
  const trailer = fenceIdx >= 0 ? fullText.slice(fenceIdx) : fullText;
  try {
    const json = extractJsonValue(trailer);
    if (Array.isArray(json)) {
      return parsePlanSlots(json);
    }
    if (json && typeof json === 'object' && 'slots' in json) {
      return parsePlanSlots((json as { slots: unknown }).slots);
    }
    return null;
  } catch {
    return null;
  }
}
