import { Input } from 'antd';
import { useState } from 'react';
import ItemActions from '../ItemActions';
import styles from './TextItemRow.module.css';

type TextItemRowProps = {
  value: string;
  deleteTitle: string;
  pending?: boolean;
  onSave: (next: string) => void;
  onDelete?: () => void;
  onCancelPending?: () => void;
};

/** 一条规矩或禁忌：只读文本，编辑、取消、保存和删除都在这一行。 */
export default function TextItemRow({
  value,
  deleteTitle,
  pending = false,
  onSave,
  onDelete,
  onCancelPending,
}: TextItemRowProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(value);
  const canSave = Boolean(draft.trim());

  function cancelEdit() {
    if (pending) {
      onCancelPending?.();
      return;
    }
    setEditing(false);
  }

  function saveEdit() {
    const next = draft.trim();
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  return (
    <div className={styles.row}>
      {editing ? (
        <Input
          className={styles.grow}
          value={draft}
          autoFocus
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : (
        <p className={styles.text}>{value}</p>
      )}
      <ItemActions
        editing={editing}
        canSave={canSave}
        deleteTitle={deleteTitle}
        onEdit={() => {
          setDraft(value);
          setEditing(true);
        }}
        onCancel={cancelEdit}
        onSave={saveEdit}
        onDelete={onDelete}
      />
    </div>
  );
}
