import 'server-only';

import { analyzeImage } from './catalog/analyze-image';
import { generateImage } from './catalog/generate-image';
import { saveDesignMd } from './catalog/save-design-md';
import { webSearch } from './catalog/web-search';
import type { AgentToolContext, AgentToolDefinition } from '../types';

// 新增 tool：对照已有 catalog 条目实现 AgentToolDefinition，再在 TOOLS 数组 import 追加。
const TOOLS: AgentToolDefinition[] = [generateImage, analyzeImage, webSearch, saveDesignMd];

/**
 * 按 Provider 主模型的能力决定哪些工具对本轮「可见」（创建实例 + 注入提示词），
 * createCatalogTools 与 getToolHints 共用本函数，保证模型拿到的工具和提示词永远一致。
 *
 * 过滤按两个能力维度进行，工具通过 requires* 标记声明自己依赖哪个维度，未标记的工具不受影响：
 *
 * | 维度                     | 成立时的业务含义                       |
 * | ------------------------ | -------------------------------------- |
 * | acceptBlindOnly          | 主模型看不见图（deepseek/ark），analyze_image 这类「代客识图」工具有价值；自带视觉的模型（zhipu glm）直读像素，这类工具纯属冗余 |
 * | acceptNoNativeWebSearch  | Provider 没有原生联网搜索（zhipu），本地 web_search 才上场；deepseek/ark 已有 SDK 原生 server tool，同职责的工具与之重叠、必须剔除 |
 */
function pickVisibleTools(
  ctx: Pick<AgentToolContext, 'mainModelAcceptsImage' | 'providerHasNativeWebSearch'>,
): AgentToolDefinition[] {
  // 主模型是「盲」的（mainModelAcceptsImage 缺省视为盲）→ 保留依赖盲模型的工具
  const acceptBlindOnly = ctx.mainModelAcceptsImage !== true;
  // Provider 无原生联网（providerHasNativeWebSearch 缺省视为无）→ 保留本地 web_search 类工具
  const acceptNoNativeWebSearch = ctx.providerHasNativeWebSearch !== true;
  // 每维判定读作「工具没声明该前提（!requires*）→ 无条件通过；声明了 → 仅当该维度成立才保留」；
  // 维度间相与，两个前提都须满足。
  return TOOLS.filter(
    (item) =>
      (acceptBlindOnly || !item.requiresBlindMainModel) &&
      (acceptNoNativeWebSearch || !item.requiresNoNativeWebSearch),
  );
}

/** 按注册表创建本地 catalog tools（不含 Provider 侧 web_search） */
export function createCatalogTools(ctx: AgentToolContext) {
  return Object.fromEntries(pickVisibleTools(ctx).map((item) => [item.id, item.create(ctx)]));
}

/** 拼接各 tool 的系统提示词；有粘贴图时追加 getPasteHint */
export function getToolHints(
  hasPastedImage: boolean,
  mainModelAcceptsImage?: boolean,
  providerHasNativeWebSearch?: boolean,
): string {
  const visibleTools = pickVisibleTools({ mainModelAcceptsImage, providerHasNativeWebSearch });
  const hints = visibleTools.map((item) => item.getHint()).join('\n');
  if (!hasPastedImage) return hints;
  const pasteHints = visibleTools
    .map((item) => item.getPasteHint?.())
    .filter((hint): hint is string => Boolean(hint));
  return pasteHints.length ? `${hints}\n\n${pasteHints.join('\n')}` : hints;
}
