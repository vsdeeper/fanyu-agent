/** [[...id]] 的 params.id 为 string[] | undefined，归一化为单段 id 或 undefined（草稿 /chat） */
export function resolveChatRouteId(idParts: string[] | undefined): string | undefined {
  if (!idParts?.length) return undefined;
  return idParts.length === 1 ? idParts[0] : undefined;
}

export function isDraftChatRoute(idParts: string[] | undefined): boolean {
  return !idParts?.length;
}
