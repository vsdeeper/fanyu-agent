import { Button, Card, Input, Popconfirm } from 'antd';
import { useState, type MouseEvent } from 'react';
import StudioCard from '@/app/studio/_components/StudioCard';
import {
  CANCEL_BUTTON,
  DELETE_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  BEAT_DELETE_CONFIRM_TITLE,
  CHAPTER_BEATS_BUTTON,
  CHAPTER_BEATS_LABEL,
  CHAPTER_BEATS_REGENERATE_BUTTON,
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
  /** 嵌套在卷卡内时去掉横向 padding，使序号与卷纲对齐。 */
  embedded?: boolean;
  generatingBeats?: boolean;
  onChange: (patch: { title?: string; purpose?: string }) => void;
  onRemove: () => void;
  onGenerateBeats: () => void;
  onChangeBeat: (beatId: string, text: string) => void;
  onRemoveBeat: (beatId: string) => void;
};

/** 单章卡片：标题 + 目的 + 按需章内节拍；「第N章」由序号自动生成。 */
export default function ChapterItem({
  chapter,
  index,
  removable,
  embedded = false,
  generatingBeats = false,
  onChange,
  onRemove,
  onGenerateBeats,
  onChangeBeat,
  onRemoveBeat,
}: ChapterItemProps) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [purposeDraft, setPurposeDraft] = useState('');

  const prefix = formatChapterPrefix(index);
  const titleName = stripChapterPrefix(chapter.title);
  const hasBeats = chapter.beats.length > 0;
  const beatRemovable = chapter.beats.length > 1;

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
    <Card size="small" className={embedded ? `${styles.card} ${styles.embedded}` : styles.card}>
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
        <>
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

          <div className={styles.beatsBlock}>
            <div className={styles.beatsHead}>
              <p className={styles.beatsLabel}>{CHAPTER_BEATS_LABEL}</p>
              <Button
                type="link"
                size="small"
                className={styles.actionBtn}
                loading={generatingBeats}
                onClick={onGenerateBeats}
              >
                {hasBeats ? CHAPTER_BEATS_REGENERATE_BUTTON : CHAPTER_BEATS_BUTTON}
              </Button>
            </div>
            {hasBeats ? (
              <div className={styles.beatsList}>
                {chapter.beats.map((beat, beatIndex) => (
                  <StudioCard
                    key={beat.id}
                    editable
                    index={beatIndex + 1}
                    value={beat.text}
                    onSave={(value) => onChangeBeat(beat.id, value)}
                    removable={beatRemovable}
                    onRemove={() => onRemoveBeat(beat.id)}
                    deleteConfirmTitle={BEAT_DELETE_CONFIRM_TITLE}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </>
      )}
    </Card>
  );
}
