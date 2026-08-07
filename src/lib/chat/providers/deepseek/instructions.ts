import type { UserLocation } from '@/lib/geo/types';

/**
 * 构建 DeepSeek 专属 instructions（在 baseInstructions 之前追加前缀）。
 *
 * 兼容处理：
 * 1. DeepSeek 不支持 web_search 的 user_location 参数（与 include 的 InvalidParameter 同款坑），
 *    改为把近似定位文本注入 instructions，让模型感知用户位置。
 * 2. DeepSeek 不返回结构化引用 URL，注入引用引导，让模型在正文末尾以 Markdown 链接形式列出来源，
 *    前端 getSourceItems 正则提取 + stripReferenceSection 隐藏正文重复区块。
 *
 * 勿在 stream-chat.ts 内联 DeepSeek 专属 instructions（与 providers/<name>/ 分层约定冲突）。
 */
export function getDeepseekInstructions({
  userLocation,
  baseInstructions,
}: {
  userLocation: UserLocation | undefined;
  baseInstructions: string;
}): string {
  const prefixes: string[] = [];

  if (userLocation?.type === 'approximate') {
    const locationParts: string[] = [];
    if (userLocation.country) locationParts.push(userLocation.country);
    if (userLocation.region) locationParts.push(userLocation.region);
    if (userLocation.city) locationParts.push(userLocation.city);
    if (locationParts.length > 0) {
      prefixes.push(
        `用户当前所在位置：${locationParts.join('，')}。若用户询问天气、新闻、本地服务等需要地理位置的问题，请基于此位置进行搜索和回答。`,
      );
    }
  }

  prefixes.push(
    '若使用联网搜索获取信息，请在回答正文末尾追加「参考来源」区块：先单独一行写出标题（如 **参考来源：**），标题之后每行一个 Markdown 链接，格式：[网页标题](URL)。不要加编号。',
  );

  return `${prefixes.join('\n\n')}\n\n${baseInstructions}`;
}
