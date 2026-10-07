import { Input } from 'antd';
import { useState } from 'react';
import ItemActions from '../ItemActions';
import { EMPTY_TIME_PLACE } from '../constants';
import styles from './TimePlaceField.module.css';

type TimePlaceFieldProps = {
  value: string;
  onSave: (next: string) => void;
};

/** 时空只有一条：编辑、取消、保存跟在正文右侧，不放在标题上。 */
export default function TimePlaceField({ value, onSave }: TimePlaceFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const text = value.trim();
  const canSave = Boolean(draft.trim());

  function saveEdit() {
    const next = draft.trim();
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  return (
    <div className={styles.row}>
      {editing ? (
        <Input.TextArea
          className={styles.grow}
          value={draft}
          autoFocus
          autoSize={{ minRows: 2, maxRows: 4 }}
          onChange={(event) => setDraft(event.target.value)}
        />
      ) : (
        <p className={text ? styles.text : styles.empty}>{text || EMPTY_TIME_PLACE}</p>
      )}
      <ItemActions
        editing={editing}
        canSave={canSave}
        onEdit={() => {
          setDraft(value);
          setEditing(true);
        }}
        onCancel={() => setEditing(false)}
        onSave={saveEdit}
      />
    </div>
  );
}
