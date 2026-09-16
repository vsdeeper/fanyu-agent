import type { UserLocation } from '@/app/api/geo/_shared/types';

/**
 * 构建 DeepSeek 专属 instructions（在 baseInstructions 之前追加前缀）。
 *
 * 联网由本地 web_search 工具显式调用，无 Provider 级 userLocation 参数可透传，
 * 故把近似定位文本注入 instructions 让模型感知用户位置并据此检索回答（与智谱同形态）。
 * 引用规范由本地 tool hint / Sources 路径负责，勿再注入「参考来源」专属引导。
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

  return prefixes.length ? `${prefixes.join('\n\n')}\n\n${baseInstructions}` : baseInstructions;
}
