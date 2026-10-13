import { Input, Select } from 'antd';
import { useState } from 'react';
import {
  ARC_EARLY_LABEL,
  ARC_LATE_LABEL,
  ARC_MID_LABEL,
  RELATION_DELETE_CONFIRM_TITLE,
  RELATION_FROM_LABEL,
  RELATION_LABEL,
  RELATION_TO_LABEL,
} from '../../../constants';
import type { NovelRelation, NovelRelationArc } from '../../../types';
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

/** 丢掉空白阶段，避免空字符串进快照。 */
function compactArc(arc: NovelRelationArc | undefined): NovelRelationArc | undefined {
  const next: NovelRelationArc = {};
  for (const key of ['early', 'mid', 'late'] as const) {
    const text = arc?.[key]?.trim();
    if (text) next[key] = text;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}

const RELATION_ARC_STAGES = [
  { key: 'early', label: ARC_EARLY_LABEL },
  { key: 'mid', label: ARC_MID_LABEL },
  { key: 'late', label: ARC_LATE_LABEL },
] as const;

/** 只保留写了内容的阶段，供只读行分行展示。 */
function readRelationStages(arc: NovelRelationArc | undefined): { label: string; text: string }[] {
  if (!arc) return [];
  return RELATION_ARC_STAGES.flatMap((stage) => {
    const text = arc[stage.key]?.trim();
    return text ? [{ label: stage.label, text }] : [];
  });
}

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
  const stages = readRelationStages(relation.arc);

  function cancelEdit() {
    if (pending) {
      onCancelPending?.();
      return;
    }
    setEditing(false);
  }

  function saveEdit() {
    if (!canSave) return;
    const arc = compactArc(draft.arc);
    onSave({
      fromId: draft.fromId,
      toId: draft.toId,
      label: draft.label.trim(),
      ...(arc ? { arc } : {}),
    });
    setEditing(false);
  }

  function setStage(key: keyof NovelRelationArc, value: string) {
    setDraft({ ...draft, arc: { ...draft.arc, [key]: value } });
  }

  return (
    <div className={styles.row}>
      {editing ? (
        <div className={styles.editStack}>
          <div className={styles.people}>
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
          </div>
          <Input.TextArea
            value={draft.arc?.early ?? ''}
            placeholder={ARC_EARLY_LABEL}
            autoSize={{ minRows: 2, maxRows: 6 }}
            onChange={(event) => setStage('early', event.target.value)}
          />
          <Input.TextArea
            value={draft.arc?.mid ?? ''}
            placeholder={ARC_MID_LABEL}
            autoSize={{ minRows: 2, maxRows: 6 }}
            onChange={(event) => setStage('mid', event.target.value)}
          />
          <Input.TextArea
            value={draft.arc?.late ?? ''}
            placeholder={ARC_LATE_LABEL}
            autoSize={{ minRows: 2, maxRows: 6 }}
            onChange={(event) => setStage('late', event.target.value)}
          />
        </div>
      ) : (
        <div className={styles.textBlock}>
          <p className={styles.text}>
            {fromName} — {relation.label} — {toName}
          </p>
          {stages.length ? (
            <div className={styles.stages}>
              {stages.map((stage) => (
                <div key={stage.label} className={styles.stage}>
                  <span className={styles.stageLabel}>{stage.label}</span>
                  <p className={styles.stageText}>{stage.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
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
