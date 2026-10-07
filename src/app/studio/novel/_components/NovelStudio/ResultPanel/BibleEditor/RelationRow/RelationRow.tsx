import { Input, Select } from 'antd';
import { useState } from 'react';
import {
  RELATION_DELETE_CONFIRM_TITLE,
  RELATION_FROM_LABEL,
  RELATION_LABEL,
  RELATION_TO_LABEL,
} from '../../../constants';
import type { NovelRelation } from '../../../types';
import ItemActions from '../ItemActions';
import { isSavableRelation } from '../utils';
import styles from './RelationRow.module.css';

type CharacterOption = { label: string; value: string };

type RelationRowProps = {
  relation: NovelRelation;
  options: CharacterOption[];
  characterIds: ReadonlySet<string>;
  fromName: string;
  toName: string;
  pending?: boolean;
  onSave: (next: NovelRelation) => void;
  onDelete?: () => void;
  onCancelPending?: () => void;
};

/** 一条关系：只读文本，编辑、取消、保存和删除都在这一行。 */
export default function RelationRow({
  relation,
  options,
  characterIds,
  fromName,
  toName,
  pending = false,
  onSave,
  onDelete,
  onCancelPending,
}: RelationRowProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(relation);
  const canSave = isSavableRelation(draft, characterIds);

  function cancelEdit() {
    if (pending) {
      onCancelPending?.();
      return;
    }
    setEditing(false);
  }

  function saveEdit() {
    if (!canSave) return;
    onSave({ ...draft, label: draft.label.trim() });
    setEditing(false);
  }

  return (
    <div className={styles.row}>
      {editing ? (
        <>
          <Select
            className={styles.grow}
            value={draft.fromId || undefined}
            options={options}
            placeholder={RELATION_FROM_LABEL}
            onChange={(fromId) => setDraft({ ...draft, fromId })}
          />
          <Input
            className={styles.grow}
            value={draft.label}
            placeholder={RELATION_LABEL}
            autoFocus
            onChange={(event) => setDraft({ ...draft, label: event.target.value })}
          />
          <Select
            className={styles.grow}
            value={draft.toId || undefined}
            options={options}
            placeholder={RELATION_TO_LABEL}
            onChange={(toId) => setDraft({ ...draft, toId })}
          />
        </>
      ) : (
        <p className={styles.text}>
          {fromName} — {relation.label} — {toName}
        </p>
      )}
      <ItemActions
        editing={editing}
        canSave={canSave}
        deleteTitle={RELATION_DELETE_CONFIRM_TITLE}
        onEdit={() => {
          setDraft(relation);
          setEditing(true);
        }}
        onCancel={cancelEdit}
        onSave={saveEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
