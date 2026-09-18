'use client';

import { useState, type MouseEvent } from 'react';
import { Button, Card, Input } from 'antd';
import {
  CANCEL_TITLE_BUTTON,
  EDIT_TITLE_BUTTON,
  SAVE_TITLE_BUTTON,
} from '../../../constants';
import styles from './TitleDirectionItem.module.css';

type TitleDirectionItemProps = {
  value: string;
  selected: boolean;
  onSelect: () => void;
  onSave: (value: string) => void;
};

/** 单条标题方向：Card 点选；标题在内容区，编辑态可取消/保存。 */
export default function TitleDirectionItem({
  value,
  selected,
  onSelect,
  onSave,
}: TitleDirectionItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEdit(event: MouseEvent) {
    event.stopPropagation();
    setDraft(value);
    setEditing(true);
  }

  function cancelEdit(event: MouseEvent) {
    event.stopPropagation();
    setDraft(value);
    setEditing(false);
  }

  function saveEdit(event: MouseEvent) {
    event.stopPropagation();
    const next = draft.trim();
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  return (
    <Card
      size="small"
      hoverable={!editing}
      className={`${styles.card} ${selected ? styles.selected : ''} ${editing ? '' : styles.interactive}`}
      onClick={editing ? undefined : onSelect}
    >
      {editing ? (
        <div className={styles.editRow} onClick={(event) => event.stopPropagation()}>
          <Input.TextArea
            rows={2}
            value={draft}
            autoFocus
            onChange={(event) => setDraft(event.target.value)}
          />
          <div className={styles.actions}>
            <Button size="small" onClick={cancelEdit}>
              {CANCEL_TITLE_BUTTON}
            </Button>
            <Button size="small" type="primary" disabled={!draft.trim()} onClick={saveEdit}>
              {SAVE_TITLE_BUTTON}
            </Button>
          </div>
        </div>
      ) : (
        <div className={styles.row}>
          <p className={styles.text}>{value}</p>
          <Button size="small" type="link" className={styles.editBtn} onClick={startEdit}>
            {EDIT_TITLE_BUTTON}
          </Button>
        </div>
      )}
    </Card>
  );
}
