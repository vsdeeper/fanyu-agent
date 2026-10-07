import { Button } from 'antd';
import { useState } from 'react';
import {
  ADD_CHARACTER_BUTTON,
  ADD_RELATION_BUTTON,
  ADD_RULE_BUTTON,
  ADD_TABOO_BUTTON,
  CHARACTERS_TITLE,
  RELATIONS_TITLE,
  RULE_DELETE_CONFIRM_TITLE,
  RULES_TITLE,
  TABOO_DELETE_CONFIRM_TITLE,
  TABOOS_TITLE,
  TIME_PLACE_LABEL,
} from '../../constants';
import type { BibleStepSnapshot, NovelCharacter, NovelRelation } from '../../types';
import CharacterCard from './CharacterCard';
import { EMPTY_RELATIONS, EMPTY_RULES, EMPTY_TABOOS, UNNAMED_CHARACTER } from './constants';
import RelationRow from './RelationRow';
import styles from './BibleEditor.module.css';
import TextItemRow from './TextItemRow';
import TimePlaceField from './TimePlaceField';
import { createBibleLocalId } from './utils';

type BibleEditorProps = {
  bible: BibleStepSnapshot;
  onChange: (next: BibleStepSnapshot) => void;
};

/** 设定右栏：默认纯文字。人物按卡片改；关系、规矩、禁忌按条改，按钮跟在删除旁边。 */
export default function BibleEditor({ bible, onChange }: BibleEditorProps) {
  const [pendingCharacter, setPendingCharacter] = useState<NovelCharacter | null>(null);
  const [pendingRelation, setPendingRelation] = useState<NovelRelation | null>(null);
  const [pendingRule, setPendingRule] = useState(false);
  const [pendingTaboo, setPendingTaboo] = useState(false);

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

  function saveRule(index: number, next: string) {
    onChange({
      ...bible,
      rules: bible.rules.map((rule, ruleIndex) => (ruleIndex === index ? next : rule)),
    });
  }

  function removeRule(index: number) {
    onChange({
      ...bible,
      rules: bible.rules.filter((_, ruleIndex) => ruleIndex !== index),
    });
  }

  function saveTaboo(index: number, next: string) {
    onChange({
      ...bible,
      taboos: bible.taboos.map((taboo, tabooIndex) => (tabooIndex === index ? next : taboo)),
    });
  }

  function removeTaboo(index: number) {
    onChange({
      ...bible,
      taboos: bible.taboos.filter((_, tabooIndex) => tabooIndex !== index),
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
                identity: '',
                desire: '',
                flaw: '',
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

      <section className={styles.block}>
        <p className={styles.fieldLabel}>{TIME_PLACE_LABEL}</p>
        <TimePlaceField
          value={bible.timePlace}
          onSave={(timePlace) => onChange({ ...bible, timePlace })}
        />
      </section>

      <section className={styles.block}>
        <p className={styles.fieldLabel}>{RULES_TITLE}</p>
        {bible.rules.length ? (
          bible.rules.map((rule, index) => (
            <TextItemRow
              key={`${rule}-${index}`}
              value={rule}
              deleteTitle={RULE_DELETE_CONFIRM_TITLE}
              onSave={(next) => saveRule(index, next)}
              onDelete={() => removeRule(index)}
            />
          ))
        ) : pendingRule ? null : (
          <p className={styles.empty}>{EMPTY_RULES}</p>
        )}
        {pendingRule ? (
          <TextItemRow
            value=""
            pending
            deleteTitle={RULE_DELETE_CONFIRM_TITLE}
            onSave={(next) => {
              onChange({ ...bible, rules: [...bible.rules, next] });
              setPendingRule(false);
            }}
            onCancelPending={() => setPendingRule(false)}
          />
        ) : (
          <Button color="primary" variant="dashed" onClick={() => setPendingRule(true)}>
            {ADD_RULE_BUTTON}
          </Button>
        )}
      </section>

      <section className={styles.block}>
        <p className={styles.fieldLabel}>{TABOOS_TITLE}</p>
        {bible.taboos.length ? (
          bible.taboos.map((taboo, index) => (
            <TextItemRow
              key={`${taboo}-${index}`}
              value={taboo}
              deleteTitle={TABOO_DELETE_CONFIRM_TITLE}
              onSave={(next) => saveTaboo(index, next)}
              onDelete={() => removeTaboo(index)}
            />
          ))
        ) : pendingTaboo ? null : (
          <p className={styles.empty}>{EMPTY_TABOOS}</p>
        )}
        {pendingTaboo ? (
          <TextItemRow
            value=""
            pending
            deleteTitle={TABOO_DELETE_CONFIRM_TITLE}
            onSave={(next) => {
              onChange({ ...bible, taboos: [...bible.taboos, next] });
              setPendingTaboo(false);
            }}
            onCancelPending={() => setPendingTaboo(false)}
          />
        ) : (
          <Button color="primary" variant="dashed" onClick={() => setPendingTaboo(true)}>
            {ADD_TABOO_BUTTON}
          </Button>
        )}
      </section>
    </div>
  );
}
