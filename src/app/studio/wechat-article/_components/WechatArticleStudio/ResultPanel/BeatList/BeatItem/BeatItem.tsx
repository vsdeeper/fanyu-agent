'use client';

import { useState } from 'react';
import { Button, Card, Input, Popconfirm } from 'antd';
import {
  BEAT_DELETE_CONFIRM_TITLE,
  CANCEL_BUTTON,
  CANCEL_TITLE_BUTTON,
  DELETE_BUTTON,
  EDIT_TITLE_BUTTON,
  SAVE_TITLE_BUTTON,
} from '../../../constants';
import styles from './BeatItem.module.css';

type BeatItemProps = {
  index: number;
  value: string;
  /** 是否可删除；仅剩一条要点时由列表置 false。 */
  removable: boolean;
  onSave: (value: string) => void;
  onRemove: () => void;
};

/** 单条写作要点：Card 纯文本展示，编辑态可取消/保存，删除需二次确认。 */
export default function BeatItem({ index, value, removable, onSave, onRemove }: BeatItemProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(value);
    setEditing(false);
  }

  function saveEdit() {
    const next = draft.trim();
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  return (
    <Card size="small" className={styles.card}>
      {editing ? (
        <div className={styles.editRow}>
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
          <span className={styles.index} aria-hidden>
            {index + 1}
          </span>
          <p className={styles.text}>{value}</p>
          {removable ? (
            <Popconfirm
              title={BEAT_DELETE_CONFIRM_TITLE}
              okText={DELETE_BUTTON}
              cancelText={CANCEL_BUTTON}
              okButtonProps={{ danger: true }}
              onConfirm={onRemove}
            >
              <Button size="small" type="link" danger className={styles.actionBtn}>
                {DELETE_BUTTON}
              </Button>
            </Popconfirm>
          ) : null}
          <Button size="small" type="link" className={styles.actionBtn} onClick={startEdit}>
            {EDIT_TITLE_BUTTON}
          </Button>
        </div>
      )}
    </Card>
  );
}
