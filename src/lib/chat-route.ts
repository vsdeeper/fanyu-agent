/** 修复：[[...id]] 的 params.id 为 string[] | undefined，统一归一化为单段 id 或 undefined */
export function resolveChatRouteId(raw: string | string[] | undefined): string | undefined {
  if (!raw) return undefined;
  const parts = Array.isArray(raw) ? raw : [raw];
  return parts.length === 1 ? parts[0] : undefined;
}

export function isDraftChatRoute(idParts: string[] | undefined): boolean {
  return !idParts?.length;
}
