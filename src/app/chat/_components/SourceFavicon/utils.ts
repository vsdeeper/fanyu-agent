/** 解析 URL hostname；非法地址返回 null */
export function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/** 卡片站点名：去 www. 的 hostname；解析失败退回原 URL */
export function getSiteName(url: string): string {
  const host = getHostname(url);
  if (!host) return url;
  return host.replace(/^www\./, '');
}

/** 是否为可导航的 http(s) URL；解析失败或其它协议返回 false */
export function isHttpUrl(url: string): boolean {
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}
