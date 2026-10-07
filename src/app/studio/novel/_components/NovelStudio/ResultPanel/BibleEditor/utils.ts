import type { NovelCharacter, NovelRelation } from '../../types';

/** 人物卡是否写全：姓名、性别、身份、欲望、缺陷都有内容。 */
export function isSavableCharacter(character: NovelCharacter): boolean {
  return Boolean(
    character.name.trim() &&
    character.gender &&
    character.identity.trim() &&
    character.desire.trim() &&
    character.flaw.trim(),
  );
}

/** 保存前去掉人物字段首尾空白。 */
export function trimCharacter(character: NovelCharacter): NovelCharacter {
  return {
    ...character,
    name: character.name.trim(),
    identity: character.identity.trim(),
    desire: character.desire.trim(),
    flaw: character.flaw.trim(),
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

/** 保存前丢掉空白条目。 */
export function cleanTextList(items: readonly string[]): string[] {
  return items.map((item) => item.trim()).filter(Boolean);
}
