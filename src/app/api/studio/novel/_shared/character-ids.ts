export type CharacterIdRef = {
  id: string;
};

export type NamedCharacterIdRef = CharacterIdRef & {
  name: string;
};

function foldCharacterId(id: string): string {
  return id.replaceAll('_', '');
}

/**
 * 把节拍里的角色 id 收成角色表里的 id。
 * 生成卷纲时模型会丢掉 id 里的下划线。去掉下划线后只对应一个人时才改回去，对上多个则保持原样。
 */
export function canonicalCharacterId(id: string, characters: readonly CharacterIdRef[]): string {
  if (characters.some((character) => character.id === id)) return id;
  const folded = foldCharacterId(id);
  if (!folded) return id;
  const matches = characters.filter((character) => foldCharacterId(character.id) === folded);
  return matches.length === 1 ? matches[0].id : id;
}

/** 一批角色 id 收成角色表里的 id，并去掉重复。 */
export function canonicalCharacterIds(
  ids: readonly string[],
  characters: readonly CharacterIdRef[],
): string[] {
  const next: string[] = [];
  for (const id of ids) {
    const canonical = canonicalCharacterId(id, characters);
    if (canonical && !next.includes(canonical)) next.push(canonical);
  }
  return next;
}

/** 角色 id 换成姓名。对不上时先按去掉下划线再对一次，仍对不上就留下原 id。 */
export function characterNameById(id: string, characters: readonly NamedCharacterIdRef[]): string {
  const canonical = canonicalCharacterId(id, characters);
  return characters.find((character) => character.id === canonical)?.name ?? id;
}
