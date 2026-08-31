import type { UserLocation } from '@/app/api/geo/_shared/types';

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
    [
      '若使用联网搜索获取信息，必须在全文结束后另起「参考来源」区块，格式如下：',
      '1. 先空一行，再单独一行写：**参考来源：**（前后都要换行；禁止接在上一句、列表项或任何正文后面）',
      '2. 标题下一行起，每行一个 Markdown 链接：[网页标题](URL)，不要编号',
      '3. 先写完整正文，再写该区块；不要把「参考来源」写进段落或列表',
      '4. 「参考来源」区块必须是全文最后一部分；标题之后不得再写任何正文、追问或其它任务',
      '5. 标题之后只能列出 Markdown 来源链接（中间可空行），禁止在链接后再追加内容',
      '6. 不要在「参考来源」区块之后写「另外」「需要我现在…」等过渡语',
    ].join('\n'),
  );

  return `${prefixes.join('\n\n')}\n\n${baseInstructions}`;
}
