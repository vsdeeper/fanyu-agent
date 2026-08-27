import { requireEnv } from '@/lib/shared/server/env';

/**
 * 智谱独立 Web Search API 出站封装（POST {ZHIPU_BASE_URL}/web_search）。
 *
 * 为何不用内置 web_search 工具（tools 数组注入形态）：实测 glm-5.3-flash 在
 * tools 里存在任何 function 工具时内置搜索完全不触发（放首位、改顶层参数均无效），
 * 而主对话必须常驻注册 generate_image 等本地工具，故联网检索改为
 * 本地 function tool 显式调用本 API（search_std 引擎 0.01 元/次）。
 */

/** 单条搜索结果（对齐响应 search_result[] 字段，仅保留喂给主模型所需部分） */
export type ZhipuWebSearchResult = {
  title: string;
  link: string;
  content: string;
  media?: string;
  publishDate?: string;
};

type ZhipuWebSearchResponse = {
  search_result?: Array<{
    title?: string;
    link?: string;
    content?: string;
    media?: string;
    publish_date?: string;
  }>;
};

/** 默认基础版自研引擎，0.01 元/次性价比最高；结果不足时再考虑 search_pro */
const SEARCH_ENGINE = 'search_std';
/** 返回条数：给主模型留足挑选余地又不撑爆工具结果 */
const RESULT_COUNT = 5;

/** 调智谱 Web Search API 检索；失败上抛由工具 execute 层统一兜底文案 */
export async function searchZhipuWeb(
  query: string,
  abortSignal?: AbortSignal,
): Promise<ZhipuWebSearchResult[]> {
  const response = await fetch(`${requireEnv('ZHIPU_BASE_URL')}/web_search`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireEnv('ZHIPU_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      search_engine: SEARCH_ENGINE,
      search_query: query,
      count: RESULT_COUNT,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    throw new Error(`[zhipu] Web Search API HTTP ${response.status}`);
  }

  const payload = (await response.json()) as ZhipuWebSearchResponse;
  const results: ZhipuWebSearchResult[] = [];
  for (const item of payload.search_result ?? []) {
    // 无标题或链接的条目对「脚注 + 来源链接」展示无意义，直接丢弃
    if (!item?.title || !item?.link) continue;
    results.push({
      title: item.title,
      link: item.link,
      content: typeof item.content === 'string' ? item.content : '',
      media: typeof item.media === 'string' ? item.media : undefined,
      publishDate: typeof item.publish_date === 'string' ? item.publish_date : undefined,
    });
  }
  return results;
}
