import { Button } from 'antd';
import { useState } from 'react';
import {
  ADD_CHARACTER_BUTTON,
  ADD_RELATION_BUTTON,
  CHARACTERS_TITLE,
  RELATIONS_TITLE,
} from '../../constants';
import type { CastStepSnapshot, NovelCharacter, NovelRelation } from '../../types';
import CharacterCard from './CharacterCard';
import { EMPTY_RELATIONS, UNNAMED_CHARACTER } from './constants';
import RelationRow from './RelationRow';
import styles from './BibleEditor.module.css';
import { createBibleLocalId } from './utils';

type BibleEditorProps = {
  bible: CastStepSnapshot;
  onChange: (next: CastStepSnapshot) => void;
};

/** 角色右栏：人物按卡片改，关系按条改。 */
export default function BibleEditor({ bible, onChange }: BibleEditorProps) {
  const [pendingCharacter, setPendingCharacter] = useState<NovelCharacter | null>(null);
  const [pendingRelation, setPendingRelation] = useState<NovelRelation | null>(null);

  const characterOptions = bible.characters
    .filter((character) => character.name.trim())
    .map((character) => ({ label: character.name, value: character.id }));
  const characterIds = new Set(bible.characters.map((character) => character.id));

  function characterName(id: string): string {
    return (
      bible.characters.find((character) => character.id === id)?.name.trim() || UNNAMED_CHARACTER
    );
  }

  function saveCharacter(next: NovelCharacter) {
    const exists = bible.characters.some((character) => character.id === next.id);
    onChange({
      ...bible,
      characters: exists
        ? bible.characters.map((character) => (character.id === next.id ? next : character))
        : [...bible.characters, next],
    });
    if (!exists) setPendingCharacter(null);
  }

  function removeCharacter(id: string) {
    onChange({
      ...bible,
      characters: bible.characters.filter((character) => character.id !== id),
      relations: bible.relations.filter(
        (relation) => relation.fromId !== id && relation.toId !== id,
      ),
    });
  }

  function saveRelation(index: number, next: NovelRelation) {
    onChange({
      ...bible,
      relations: bible.relations.map((relation, relationIndex) =>
        relationIndex === index ? next : relation,
      ),
    });
  }

  function removeRelation(index: number) {
    onChange({
      ...bible,
      relations: bible.relations.filter((_, relationIndex) => relationIndex !== index),
    });
  }

  return (
    <div className={styles.editor}>
      <section className={styles.block}>
        <p className={styles.fieldLabel}>{CHARACTERS_TITLE}</p>
        {bible.characters.map((character) => (
          <CharacterCard
            key={character.id}
            character={character}
            onSave={saveCharacter}
            onDelete={() => removeCharacter(character.id)}
          />
        ))}
        {pendingCharacter ? (
          <CharacterCard
            character={pendingCharacter}
            pending
            onSave={saveCharacter}
            onCancelPending={() => setPendingCharacter(null)}
          />
        ) : (
          <Button
            color="primary"
            variant="dashed"
            onClick={() =>
              setPendingCharacter({
                id: createBibleLocalId('c'),
                name: '',
                role: 'supporting',
                origin: '',
                trait: '',
              })
            }
          >
            {ADD_CHARACTER_BUTTON}
          </Button>
        )}
      </section>

      <section className={styles.block}>
        <p className={styles.fieldLabel}>{RELATIONS_TITLE}</p>
        {bible.relations.length ? (
          bible.relations.map((relation, index) => (
            <RelationRow
              key={`${relation.fromId}-${relation.toId}-${relation.label}-${index}`}
              relation={relation}
              options={characterOptions}
              characterIds={characterIds}
              fromName={characterName(relation.fromId)}
              toName={characterName(relation.toId)}
              onSave={(next) => saveRelation(index, next)}
              onDelete={() => removeRelation(index)}
            />
          ))
        ) : pendingRelation ? null : (
          <p className={styles.empty}>{EMPTY_RELATIONS}</p>
        )}
        {pendingRelation ? (
          <RelationRow
            relation={pendingRelation}
            options={characterOptions}
            characterIds={characterIds}
            fromName=""
            toName=""
            pending
            onSave={(next) => {
              onChange({ ...bible, relations: [...bible.relations, next] });
              setPendingRelation(null);
            }}
            onCancelPending={() => setPendingRelation(null)}
          />
        ) : (
          <Button
            color="primary"
            variant="dashed"
            disabled={characterOptions.length < 2}
            onClick={() =>
              setPendingRelation({
                fromId: characterOptions[0]?.value ?? '',
                toId: characterOptions[1]?.value ?? '',
                label: '',
              })
            }
          >
            {ADD_RELATION_BUTTON}
          </Button>
        )}
      </section>
    </div>
  );
}
