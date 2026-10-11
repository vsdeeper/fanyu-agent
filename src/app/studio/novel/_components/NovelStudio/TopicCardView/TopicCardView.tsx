import { Button, Input } from 'antd';
import { useState, type MouseEvent } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  TOPIC_SLOT_CORE_LABEL,
  TOPIC_SLOT_GENRE_VOLUME_LABEL,
  TOPIC_SLOT_RISK_LABEL,
  TOPIC_SLOT_WHY_LABEL,
  TOPIC_TITLE_LABEL,
} from '../constants';
import type { TopicCard } from '../types';
import { isSavableTopic, trimTopic } from './utils';
import styles from './TopicCardView.module.css';

type TopicCardViewProps = {
  topic: TopicCard;
  selected?: boolean;
  /** 有回调时可点选；无回调时为只读展示。 */
  onSelect?: () => void;
  /** 有回调时可编辑保存；无回调时不显示编辑入口。 */
  onSave?: (next: TopicCard) => void;
};

/** 选题卡：调研步点选与编辑（类型体量 / 值得写 / 故事核 / 风险）。 */
export default function TopicCardView({
  topic,
  selected = false,
  onSelect,
  onSave,
}: TopicCardViewProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(topic);
  const editable = Boolean(onSave);
  const canSave = isSavableTopic(draft);

  function startEdit(event?: MouseEvent) {
    event?.stopPropagation();
    setDraft(topic);
    setEditing(true);
  }

  function cancelEdit(event?: MouseEvent) {
    event?.stopPropagation();
    setEditing(false);
  }

  function saveEdit(event?: MouseEvent) {
    event?.stopPropagation();
    if (!canSave || !onSave) return;
    onSave(trimTopic(draft));
    setEditing(false);
  }

  if (editing && onSave) {
    return (
      <StudioCard selected={selected} interactive={false}>
        <div className={styles.editStack} onClick={(event) => event.stopPropagation()}>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{TOPIC_TITLE_LABEL}</p>
            <Input
              value={draft.title}
              placeholder={TOPIC_TITLE_LABEL}
              autoFocus
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{TOPIC_SLOT_GENRE_VOLUME_LABEL}</p>
            <Input
              value={draft.genreVolume}
              placeholder={TOPIC_SLOT_GENRE_VOLUME_LABEL}
              onChange={(event) => setDraft({ ...draft, genreVolume: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{TOPIC_SLOT_WHY_LABEL}</p>
            <Input.TextArea
              value={draft.why}
              rows={3}
              placeholder={TOPIC_SLOT_WHY_LABEL}
              onChange={(event) => setDraft({ ...draft, why: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{TOPIC_SLOT_CORE_LABEL}</p>
            <Input.TextArea
              value={draft.core}
              rows={3}
              placeholder={TOPIC_SLOT_CORE_LABEL}
              onChange={(event) => setDraft({ ...draft, core: event.target.value })}
            />
          </div>
          <div className={styles.field}>
            <p className={styles.fieldLabel}>{TOPIC_SLOT_RISK_LABEL}</p>
            <Input.TextArea
              value={draft.risk ?? ''}
              rows={2}
              placeholder={TOPIC_SLOT_RISK_LABEL}
              onChange={(event) => setDraft({ ...draft, risk: event.target.value })}
            />
          </div>
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

  const metaItems = [
    { label: TOPIC_SLOT_GENRE_VOLUME_LABEL, value: topic.genreVolume },
    { label: TOPIC_SLOT_WHY_LABEL, value: topic.why },
    { label: TOPIC_SLOT_CORE_LABEL, value: topic.core },
    ...(topic.risk ? [{ label: TOPIC_SLOT_RISK_LABEL, value: topic.risk }] : []),
  ];

  return (
    <StudioCard
      selected={selected}
      interactive={Boolean(onSelect)}
      title={<span title={topic.title}>{topic.title}</span>}
      extra={
        editable ? (
          <span onClick={(event) => event.stopPropagation()}>
            <Button type="link" size="small" onClick={startEdit}>
              {EDIT_BUTTON}
            </Button>
          </span>
        ) : undefined
      }
      onClick={onSelect}
      metaItems={metaItems}
    />
  );
}
