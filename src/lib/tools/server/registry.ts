import 'server-only';

import { analyzeImage } from './catalog/analyze-image';
import { generateImage } from './catalog/generate-image';
import type { AgentToolContext, AgentToolDefinition } from '../types';

// 新增 tool：对照已有 catalog 条目实现 AgentToolDefinition，再在 TOOLS 数组 import 追加。
const TOOLS: AgentToolDefinition[] = [generateImage, analyzeImage];

/** 按注册表创建本地 catalog tools（不含 Provider 侧 web_search） */
export function createCatalogTools(ctx: AgentToolContext) {
  return Object.fromEntries(TOOLS.map((item) => [item.id, item.create(ctx)]));
}

/** 拼接各 tool 的系统提示词；有粘贴图时追加 getPasteHint */
export function getToolHints(hasPastedImage: boolean): string {
  const hints = TOOLS.map((item) => item.getHint()).join('\n');
  if (!hasPastedImage) return hints;
  const pasteHints = TOOLS.map((item) => item.getPasteHint?.()).filter((hint): hint is string =>
    Boolean(hint),
  );
  return pasteHints.length ? `${hints}\n\n${pasteHints.join('\n')}` : hints;
}
