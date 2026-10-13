import { Button, Input, Popconfirm } from 'antd';
import { useState } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  ADD_ENTRY_BUTTON,
  CONFIRM_CANCEL,
  DELETE_BUTTON,
  ORDER_DELETE_CONFIRM_TITLE,
  ORDER_ENTRY_NAME_LABEL,
  ORDER_ENTRY_RULE_LABEL,
  ORDER_NAME_LABEL,
  ORDER_QUESTION_LABEL,
} from '../../../constants';
import type { NovelWorldOrder } from '../../../types';
import styles from '../card.module.css';
import {
  blankOrderEntry,
  isSavableOrder,
  orderToDraft,
  trimOrder,
  type OrderEntryDraft,
} from './utils';

type OrderCardProps = {
  order: NovelWorldOrder;
  index: number;
  removable: boolean;
  /** 尚未写入方案的新秩序；取消即丢弃。 */
  pending?: boolean;
  onSave: (next: NovelWorldOrder) => void;
  onDelete?: () => void;
  onCancelPending?: () => void;
};

/** 一层秩序：名称、要回答的问题，以及若干规则。 */
export default function OrderCard({
  order,
  index,
  removable,
  pending = false,
  onSave,
  onDelete,
  onCancelPending,
}: OrderCardProps) {
  const [editing, setEditing] = useState(pending);
  const [draft, setDraft] = useState(() => {
    const next = orderToDraft(order);
    return next.entries.length > 0 ? next : { ...next, entries: [blankOrderEntry()] };
  });
  const canSave = isSavableOrder(draft);

  function startEdit() {
    const next = orderToDraft(order);
    setDraft(next.entries.length > 0 ? next : { ...next, entries: [blankOrderEntry()] });
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
    const next = trimOrder(order.id, draft);
    if (!next) return;
    onSave(next);
    setEditing(false);
  }

  function setEntry(entryId: string, patch: Partial<OrderEntryDraft>) {
    setDraft({
      ...draft,
      entries: draft.entries.map((entry) =>
        entry.id === entryId ? { ...entry, ...patch } : entry,
      ),
    });
  }

  if (editing) {
    return (
      <StudioCard>
        <div className={styles.editStack}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{ORDER_NAME_LABEL}</p>
            <Input
              value={draft.name}
              placeholder={ORDER_NAME_LABEL}
              autoFocus
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{ORDER_QUESTION_LABEL}</p>
            <Input.TextArea
              value={draft.question}
              placeholder={ORDER_QUESTION_LABEL}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => setDraft({ ...draft, question: event.target.value })}
            />
          </div>
          {draft.entries.map((entry) => (
            <div key={entry.id} className={styles.pair}>
              <Input
                className={styles.pairName}
                value={entry.name}
                placeholder={ORDER_ENTRY_NAME_LABEL}
                onChange={(event) => setEntry(entry.id, { name: event.target.value })}
              />
              <Input
                className={styles.pairText}
                value={entry.rule}
                placeholder={ORDER_ENTRY_RULE_LABEL}
                onChange={(event) => setEntry(entry.id, { rule: event.target.value })}
              />
              <Button
                type="text"
                danger
                size="small"
                onClick={() =>
                  setDraft({
                    ...draft,
                    entries: draft.entries.filter((item) => item.id !== entry.id),
                  })
                }
              >
                {DELETE_BUTTON}
              </Button>
            </div>
          ))}
          <Button
            size="small"
            color="primary"
            variant="dashed"
            onClick={() => setDraft({ ...draft, entries: [...draft.entries, blankOrderEntry()] })}
          >
            {ADD_ENTRY_BUTTON}
          </Button>
          <div className={styles.actions}>
            <Button size="small" onClick={cancelEdit}>
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
      title={
        <span className={styles.title}>
          <span className={styles.index}>{index + 1}</span>
          <span title={order.name}>{order.name}</span>
        </span>
      }
      extra={
        <span className={styles.extra}>
          {removable && onDelete ? (
            <Popconfirm
              title={ORDER_DELETE_CONFIRM_TITLE}
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
          <Button type="link" size="small" onClick={startEdit}>
            {EDIT_BUTTON}
          </Button>
        </span>
      }
    >
      <div className={styles.readStack}>
        <div>
          <p className={styles.readLabel}>{ORDER_QUESTION_LABEL}</p>
          <p className={styles.readText}>{order.question}</p>
        </div>
        {order.entries.map((entry) => (
          <div key={entry.id}>
            <p className={styles.readLabel}>{entry.name}</p>
            <p className={styles.readText}>{entry.rule}</p>
          </div>
        ))}
      </div>
    </StudioCard>
  );
}
