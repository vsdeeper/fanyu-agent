import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';

import { getZhipuClient } from './client';
import { getZhipuInstructions } from './instructions';
import type { ChatProviderRuntime, ChatProviderCapabilities } from '../types';

/** 智谱 Provider 能力：多模态直读图；联网搜索经本地工具调独立 API（usesSdkWebSearchTool=false） */
const capabilities: ChatProviderCapabilities = {
  acceptsImageInput: true,
  usesSdkWebSearchTool: false,
  needsOpenaiStoreFalse: false,
};

/**
 * 智谱 Provider 运行时：
 * - 主对话走 client.chat（Chat Completions 兼容端点），并经 <think> 标签提取 thinking
 * - 联网由本地 web_search 工具显式调用，来源经 web-search-source-bridge 注入 UI 流
 */
export const zhipuRuntime: ChatProviderRuntime = {
  getClient: getZhipuClient,

  getMainModel(modelId: string) {
    return wrapLanguageModel({
      model: getZhipuClient().chat(modelId),
      // 提取 sse.ts 以 <think> 标签重写的思考文本，产出 reasoning part 供前端 Think 区块渲染
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  },

  getCapabilities() {
    return capabilities;
  },

  getWebSearchArgs() {
    return {};
  },

  getInstructions({ userLocation, baseInstructions }) {
    return getZhipuInstructions({ userLocation, baseInstructions });
  },

  getOpenAIOptions() {
    return {};
  },
};
