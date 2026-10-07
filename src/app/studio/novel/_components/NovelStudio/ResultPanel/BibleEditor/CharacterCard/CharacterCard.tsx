import { Button, Input, Popconfirm, Select } from 'antd';
import { useState } from 'react';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  CHARACTER_DELETE_CONFIRM_TITLE,
  CHARACTER_DESIRE_LABEL,
  CHARACTER_FLAW_LABEL,
  CHARACTER_GENDER_LABEL,
  CHARACTER_GENDER_OPTIONS,
  CHARACTER_IDENTITY_LABEL,
  CHARACTER_NAME_LABEL,
  CHARACTER_ROLE_LABEL,
  CHARACTER_ROLE_OPTIONS,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
} from '../../../constants';
import type { NovelCharacter } from '../../../types';
import { EMPTY_CHARACTER_FIELD, UNNAMED_CHARACTER } from '../constants';
import { isSavableCharacter, trimCharacter } from '../utils';
import styles from './CharacterCard.module.css';

type CharacterCardProps = {
  character: NovelCharacter;
  /** 尚未写入设定的新人物；取消即丢弃。 */
  pending?: boolean;
  onSave: (next: NovelCharacter) => void;
  onCancelPending?: () => void;
  onDelete?: () => void;
};

/** 单个人物卡：默认同读文本，单独进入编辑后取消或保存。 */
export default function CharacterCard({
  character,
  pending = false,
  onSave,
  onCancelPending,
  onDelete,
}: CharacterCardProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(character);
  const roleLabel =
    CHARACTER_ROLE_OPTIONS.find((option) => option.value === character.role)?.label ??
    character.role;
  const genderLabel = CHARACTER_GENDER_OPTIONS.find(
    (option) => option.value === character.gender,
  )?.label;
  const canSave = isSavableCharacter(draft);

  function startEdit() {
    setDraft(character);
    setEditing(true);
  }

  function cancelEdit() {
    if (pending) {
      onCancelPending?.();
      return;
    }
    setEditing(false);
  }

  function saveEdit() {
    if (!canSave) return;
    onSave(trimCharacter(draft));
    setEditing(false);
  }

  if (!editing) {
    return (
      <div className={styles.card}>
        <div className={styles.head}>
          <p className={styles.name}>{character.name.trim() || UNNAMED_CHARACTER}</p>
          <div className={styles.actions}>
            <Button type="link" size="small" className={styles.editButton} onClick={startEdit}>
              {EDIT_BUTTON}
            </Button>
            {onDelete ? (
              <Popconfirm
                title={CHARACTER_DELETE_CONFIRM_TITLE}
                okText={DELETE_BUTTON}
                cancelText={CONFIRM_CANCEL}
                okButtonProps={{ danger: true }}
                onConfirm={onDelete}
              >
                <Button type="text" danger size="small">
                  {DELETE_BUTTON}
                </Button>
              </Popconfirm>
            ) : null}
          </div>
        </div>
        <p className={styles.line}>
          <span className={styles.label}>{CHARACTER_ROLE_LABEL}</span>
          {roleLabel}
        </p>
        <p className={styles.line}>
          <span className={styles.label}>{CHARACTER_GENDER_LABEL}</span>
          {genderLabel || <span className={styles.empty}>{EMPTY_CHARACTER_FIELD}</span>}
        </p>
        <p className={styles.line}>
          <span className={styles.label}>{CHARACTER_IDENTITY_LABEL}</span>
          {character.identity.trim() || (
            <span className={styles.empty}>{EMPTY_CHARACTER_FIELD}</span>
          )}
        </p>
        <p className={styles.line}>
          <span className={styles.label}>{CHARACTER_DESIRE_LABEL}</span>
          {character.desire.trim() || <span className={styles.empty}>{EMPTY_CHARACTER_FIELD}</span>}
        </p>
        <p className={styles.line}>
          <span className={styles.label}>{CHARACTER_FLAW_LABEL}</span>
          {character.flaw.trim() || <span className={styles.empty}>{EMPTY_CHARACTER_FIELD}</span>}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <div className={styles.editHead}>
        <Input
          className={styles.grow}
          value={draft.name}
          placeholder={CHARACTER_NAME_LABEL}
          autoFocus
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
        />
        <Select
          className={styles.roleSelect}
          value={draft.role}
          options={CHARACTER_ROLE_OPTIONS}
          onChange={(role) => setDraft({ ...draft, role })}
        />
        <Select
          className={styles.genderSelect}
          value={draft.gender}
          options={CHARACTER_GENDER_OPTIONS}
          placeholder={CHARACTER_GENDER_LABEL}
          onChange={(gender) => setDraft({ ...draft, gender })}
        />
      </div>
      <Input
        value={draft.identity}
        placeholder={CHARACTER_IDENTITY_LABEL}
        onChange={(event) => setDraft({ ...draft, identity: event.target.value })}
      />
      <Input
        value={draft.desire}
        placeholder={CHARACTER_DESIRE_LABEL}
        onChange={(event) => setDraft({ ...draft, desire: event.target.value })}
      />
      <Input
        value={draft.flaw}
        placeholder={CHARACTER_FLAW_LABEL}
        onChange={(event) => setDraft({ ...draft, flaw: event.target.value })}
      />
      <div className={`${styles.actions} ${styles.editActions}`}>
        <Button size="small" onClick={cancelEdit}>
          {CANCEL_BUTTON}
        </Button>
        <Button size="small" type="primary" disabled={!canSave} onClick={saveEdit}>
          {SAVE_BUTTON}
        </Button>
      </div>
    </div>
  );
}
