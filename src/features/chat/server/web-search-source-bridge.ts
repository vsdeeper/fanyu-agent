import type { TextStreamPart, ToolSet } from 'ai';

/**
 * 本地 web_search 工具结果 → source 流 part 桥接。
 *
 * 本地 function tool 的结果由 AI SDK 内核执行产生、仅出现在 streamText 的
 * result.stream（ai 层 TextStreamPart），不经过语言模型流（Provider 层 wrapStream
 * 拦不到）；在 toUIMessageStream 之前把工具 output 合成 source part，
 * 由 sendSources 转 UIMessage source-url part → 前端 Sources 列表渲染并随消息持久化。
 *
 * 仅「无原生联网搜索」的 Provider 链路使用；deepseek/ark 的原生 server tool
 * 自带注解产物，再走本桥接会重复来源。
 */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** 从工具输出提取可展示来源条目（结构窄化，避免反向依赖 lib/tools 类型） */
function extractSourceItems(output: unknown): Array<{ url: string; title: string }> {
  if (!isRecord(output) || output.ok !== true || !Array.isArray(output.results)) {
    return [];
  }
  const items: Array<{ url: string; title: string }> = [];
  for (const item of output.results) {
    if (!isRecord(item) || typeof item.link !== 'string' || !item.link) continue;
    items.push({
      url: item.link,
      title: typeof item.title === 'string' && item.title ? item.title : item.link,
    });
  }
  return items;
}

/** 提取 URL 的展示域名（小写、去 www. 前缀）；解析失败返回 null，退回仅 URL 级去重 */
function extractDomain(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '') || null;
  } catch {
    return null;
  }
}

/**
 * 创建 ai 层来源桥接 TransformStream：每遇 web_search 工具结果，
 * 在其前合成 source part（同请求内按 URL + 域名双重去重，id 以 toolCallId 为前缀保证唯一）。
 * 域名去重保留该域首次出现的条目（排名靠前），拦截多次检索间同站点不同页面的堆积。
 * 泛型参数随调用方 streamText 的 tools 类型推断，避免加宽流元素类型。
 */
export function createLocalWebSearchSourceBridge<TOOLS extends ToolSet>(): TransformStream<
  TextStreamPart<TOOLS>,
  TextStreamPart<TOOLS>
> {
  const seenUrls = new Set<string>();
  const seenDomains = new Set<string>();
  let sourceSeq = 0;

  return new TransformStream<TextStreamPart<TOOLS>, TextStreamPart<TOOLS>>({
    transform(part, controller) {
      if (part.type === 'tool-result' && part.toolName === 'web_search') {
        for (const { url, title } of extractSourceItems(part.output)) {
          const domain = extractDomain(url);
          if (seenUrls.has(url) || (domain !== null && seenDomains.has(domain))) continue;
          seenUrls.add(url);
          if (domain !== null) seenDomains.add(domain);
          controller.enqueue({
            type: 'source',
            sourceType: 'url',
            id: `${part.toolCallId}-${++sourceSeq}`,
            url,
            title,
          });
        }
      }
      controller.enqueue(part);
    },
  });
}
