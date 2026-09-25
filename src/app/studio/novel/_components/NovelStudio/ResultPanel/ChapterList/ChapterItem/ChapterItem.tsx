import { Button, Card, Input, Popconfirm } from 'antd';
import { useState, type MouseEvent } from 'react';
import {
  CANCEL_BUTTON,
  DELETE_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/SelectableCard/constants';
import {
  CHAPTER_DELETE_CONFIRM_TITLE,
  CHAPTER_PURPOSE_LABEL,
  CHAPTER_TITLE_PLACEHOLDER,
} from '../../../constants';
import type { StructureChapter } from '../../../types';
import { formatChapterPrefix, stripChapterPrefix } from '../utils';
import styles from './ChapterItem.module.css';

type ChapterItemProps = {
  chapter: StructureChapter;
  /** 1-based 章节序号，用于自动生成「第N章」。 */
  index: number;
  removable: boolean;
  onChange: (patch: { title?: string; purpose?: string }) => void;
  onRemove: () => void;
};

/** 单章卡片：展示/编辑标题名与本章目的；「第N章」由序号自动生成，不可改。 */
export default function ChapterItem({
  chapter,
  index,
  removable,
  onChange,
  onRemove,
}: ChapterItemProps) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [purposeDraft, setPurposeDraft] = useState('');

  const prefix = formatChapterPrefix(index);
  const titleName = stripChapterPrefix(chapter.title);

  const startEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    setTitleDraft(titleName);
    setPurposeDraft(chapter.purpose);
    setEditing(true);
  };

  const cancelEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    setTitleDraft('');
    setPurposeDraft('');
    setEditing(false);
  };

  const saveEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    const nextTitle = titleDraft.trim();
    const nextPurpose = purposeDraft.trim();
    if (!nextTitle || !nextPurpose) return;
    onChange({ title: nextTitle, purpose: nextPurpose });
    setTitleDraft('');
    setPurposeDraft('');
    setEditing(false);
  };

  const canSave = Boolean(titleDraft.trim() && purposeDraft.trim());

  return (
    <Card size="small" className={styles.card}>
      {editing ? (
        <div className={styles.editStack} onClick={(event) => event.stopPropagation()}>
          <div className={styles.titleEditRow}>
            <span className={styles.index} aria-hidden>
              {index}
            </span>
            <span className={styles.prefix}>{prefix}</span>
            <Input
              className={styles.titleInput}
              value={titleDraft}
              placeholder={CHAPTER_TITLE_PLACEHOLDER}
              autoFocus
              onChange={(event) => setTitleDraft(event.target.value)}
            />
          </div>
          <div className={styles.purposeEdit}>
            <p className={styles.purposeLabel}>{CHAPTER_PURPOSE_LABEL}</p>
            <Input.TextArea
              value={purposeDraft}
              rows={3}
              onChange={(event) => setPurposeDraft(event.target.value)}
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
      ) : (
        <div className={styles.displayRow}>
          <div className={styles.displayMain}>
            <span className={styles.index} aria-hidden>
              {index}
            </span>
            <div className={styles.bodyStack}>
              <p className={styles.titleText}>
                {prefix}
                {titleName ? `　${titleName}` : ''}
              </p>
              <p className={styles.purposeLabel}>{CHAPTER_PURPOSE_LABEL}</p>
              <p className={styles.purposeText}>{chapter.purpose}</p>
            </div>
          </div>
          {removable ? (
            <span className={styles.displayActions} onClick={(event) => event.stopPropagation()}>
              <Popconfirm
                title={CHAPTER_DELETE_CONFIRM_TITLE}
                okText={DELETE_BUTTON}
                cancelText={CANCEL_BUTTON}
                okButtonProps={{ danger: true }}
                onConfirm={onRemove}
              >
                <Button size="small" type="link" danger className={styles.actionBtn}>
                  {DELETE_BUTTON}
                </Button>
              </Popconfirm>
            </span>
          ) : null}
          <Button type="link" size="small" className={styles.actionBtn} onClick={startEdit}>
            {EDIT_BUTTON}
          </Button>
        </div>
      )}
    </Card>
  );
}
