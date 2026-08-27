import { tool } from 'ai';
import { z } from 'zod';

import {
  searchZhipuWeb,
  type ZhipuWebSearchResult,
} from '@/features/chat/server/providers/zhipu/web-search';
import type { AgentToolDefinition } from '@/lib/tools/types';

/**
 * web_search 工具：调智谱独立 Web Search API 联网检索，结果回喂主模型作答。
 * 仅「主模型无原生联网搜索」的 Provider 链路注册（deepseek/ark 走 SDK 原生
 * server tool，见 stream-chat 的 usesSdkWebSearchTool gating）。
 */

export type WebSearchToolResult =
  { ok: true; results: ZhipuWebSearchResult[] } | { ok: false; error: string };

/** 联网搜索工具使用规则（始终拼入 baseInstructions） */
function getWebSearchHint(): string {
  return `联网搜索工具使用规则：
- 涉及时效性信息（近期新闻、天气、赛事、价格、版本发布等）或不确定的事实而训练数据可能过时时，先调用 web_search 再回答；纯常识、代码、数学推导勿调用
- query 用 1-2 个简短中文关键词短语，避免整句疑问；需要多个主题时分开多次调用
- 回答时在对应结论后以 Markdown 数字脚注标注来源，格式为 [1](链接)，并在文中自然引用检索到的信息；未检索到的内容不要编造来源
- 工具返回失败时如实告知未能联网获取，不要凭旧知识冒充最新信息`;
}

/** 创建 web_search：出站调智谱 Web Search API 并压缩条目回喂 */
function createWebSearchTool() {
  return tool({
    description: '联网搜索实时网页信息（新闻/天气/价格等时效性内容），返回标题、链接与摘要列表。',
    inputSchema: z.object({
      query: z.string().min(1).describe('搜索关键词短语（简短、具体）'),
    }),
    execute: async ({ query }, { abortSignal }): Promise<WebSearchToolResult> => {
      try {
        const results = await searchZhipuWeb(query, abortSignal);
        if (results.length === 0) {
          return { ok: false, error: '没有搜索到相关结果' };
        }
        return { ok: true, results };
      } catch (err) {
        console.error('[web_search]', err);
        return { ok: false, error: '联网搜索服务暂不可用，请稍后重试' };
      }
    },
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `联网搜索失败：${output.error}` };
      }
      const lines = output.results.map(
        (item: ZhipuWebSearchResult, index: number) =>
          `[${index + 1}] ${item.title}${item.publishDate ? `（${item.publishDate}）` : ''}\n链接：${item.link}\n摘要：${item.content.slice(0, 300)}`,
      );
      return {
        type: 'text',
        value: `搜索到 ${output.results.length} 条结果：\n${lines.join('\n\n')}`,
      };
    },
  });
}

export const webSearch: AgentToolDefinition = {
  id: 'web_search',
  // 主模型自带原生联网的 Provider（deepseek/ark）已由 SDK server tool 提供同等能力，本地工具与之互斥
  requiresNoNativeWebSearch: true,
  create: () => createWebSearchTool(),
  getHint: getWebSearchHint,
};
