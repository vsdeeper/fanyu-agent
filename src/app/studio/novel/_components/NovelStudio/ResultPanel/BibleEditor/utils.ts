import type { NovelCharacter, NovelCharacterArc, NovelRelation } from '../../types';

/** 人物卡是否可保存：姓名、性别、出身、特质有内容；变化可空。 */
export function isSavableCharacter(character: NovelCharacter): boolean {
  return Boolean(
    character.name.trim() && character.gender && character.origin.trim() && character.trait.trim(),
  );
}

function trimArc(arc: NovelCharacterArc | undefined): NovelCharacterArc | undefined {
  if (!arc) return undefined;
  const next: NovelCharacterArc = {};
  for (const key of ['early', 'mid', 'late', 'end'] as const) {
    const text = arc[key]?.trim();
    if (text) next[key] = text;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

/** 保存前去掉人物字段首尾空白。 */
export function trimCharacter(character: NovelCharacter): NovelCharacter {
  const arc = trimArc(character.arc);
  return {
    ...character,
    name: character.name.trim(),
    origin: character.origin.trim(),
    trait: character.trait.trim(),
    ...(arc ? { arc } : { arc: undefined }),
  };
}

/** 关系是否指向两名不同的已有人物，且写了关系名。 */
export function isSavableRelation(
  relation: NovelRelation,
  characterIds: ReadonlySet<string>,
): boolean {
  return (
    characterIds.has(relation.fromId) &&
    characterIds.has(relation.toId) &&
    relation.fromId !== relation.toId &&
    Boolean(relation.label.trim())
  );
}

/** 新人物的本地 id；保存前不写入设定。 */
export function createBibleLocalId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}
