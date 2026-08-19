/**
 * 方舟 instructions：透传 baseInstructions。
 * 近似定位经 web_search 的 userLocation 透传；引用经 SSE annotation 注入，不在 instructions 堆引导。
 */
export function getArkInstructions(baseInstructions: string): string {
  return baseInstructions;
}
