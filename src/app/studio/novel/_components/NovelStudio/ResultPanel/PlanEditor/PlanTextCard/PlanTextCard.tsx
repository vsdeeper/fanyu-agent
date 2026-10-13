import { Button, Input } from 'antd';
import { useState } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import { EMPTY_FIELD_TEXT } from '../../../constants';
import styles from '../card.module.css';
import { isSavablePlanText } from './utils';

type PlanTextCardProps = {
  title: string;
  value: string;
  onSave: (value: string) => void;
};

/** 方案里的一段正文：隐藏真相、终局或主题。 */
export default function PlanTextCard({ title, value, onSave }: PlanTextCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const canSave = isSavablePlanText(draft);

  function startEdit() {
    setDraft(value);
    setEditing(true);
  }

  function saveEdit() {
    if (!canSave) return;
    onSave(draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <StudioCard>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{title}</p>
            <Input.TextArea
              value={draft}
              placeholder={title}
              autoFocus
              autoSize={{ minRows: 2, maxRows: 8 }}
              onChange={(event) => setDraft(event.target.value)}
            />
          </div>
          <div className={styles.actions}>
            <Button size="small" onClick={() => setEditing(false)}>
              {CANCEL_BUTTON}
            </Button>
            <Button size="small" type="primary" disabled={!canSave} onClick={saveEdit}>
              {SAVE_BUTTON}
            </Button>
          </div>
        </div>
      </StudioCard>
    );
  }

  return (
    <StudioCard
      title={title}
      extra={
        <Button type="link" size="small" onClick={startEdit}>
          {EDIT_BUTTON}
        </Button>
      }
    >
      <p className={styles.readText}>{value.trim() || EMPTY_FIELD_TEXT}</p>
    </StudioCard>
  );
}
