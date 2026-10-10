import 'server-only';

import { ZHIPU_REASONING_EFFORTS } from '@/app/api/chat/_shared/chat-settings';
import type { ChatProvider } from '@/app/api/chat/_server/providers/config';
import {
  NOVEL_DEFAULT_REASONING_EFFORT,
  readNovelReasoningEffort,
  type NovelReasoningEffort,
} from '../_shared/constants';

/**
 * 小说出站思考强度：左栏值覆盖对话设置。
 * 方舟没有 reasoning.effort，返回 undefined 表示不传。
 * 智谱不收 none，非法或缺省都用 max。
 */
export function resolveNovelReasoningEffort(
  provider: ChatProvider,
  raw: unknown,
): NovelReasoningEffort | undefined {
  if (provider === 'ark') return undefined;
  if (provider === 'zhipu') {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if ((ZHIPU_REASONING_EFFORTS as readonly string[]).includes(value)) {
      return value as NovelReasoningEffort;
    }
    return NOVEL_DEFAULT_REASONING_EFFORT;
  }
  return readNovelReasoningEffort(raw);
}
