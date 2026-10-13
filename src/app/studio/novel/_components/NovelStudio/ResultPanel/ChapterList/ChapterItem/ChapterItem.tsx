import { Button, Card, Input, Popconfirm } from 'antd';
import { useState, type MouseEvent } from 'react';
import {
  CANCEL_BUTTON,
  DELETE_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  CHAPTER_DELETE_CONFIRM_TITLE,
  CHAPTER_EVENT_LABEL,
  CHAPTER_HOOK_HINT,
  CHAPTER_HOOK_LABEL,
  CHAPTER_SCENE_LABEL,
  CHAPTER_TITLE_PLACEHOLDER,
  CONFIRM_CANCEL,
} from '../../../constants';
import type { StructureChapter } from '../../../types';
import { formatChapterPrefix, stripChapterPrefix } from '../utils';
import styles from './ChapterItem.module.css';

type ChapterItemProps = {
  chapter: StructureChapter;
  index: number;
  removable: boolean;
  embedded?: boolean;
  onChange: (patch: Partial<Pick<StructureChapter, 'title' | 'scene' | 'event' | 'hook'>>) => void;
  onRemove: () => void;
};

/** 单章卡片：标题、场景、事件、钩子。「第N章」由序号生成。 */
export default function ChapterItem({
  chapter,
  index,
  removable,
  embedded = false,
  onChange,
  onRemove,
}: ChapterItemProps) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [sceneDraft, setSceneDraft] = useState('');
  const [eventDraft, setEventDraft] = useState('');
  const [hookDraft, setHookDraft] = useState('');
  const prefix = formatChapterPrefix(index);
  const titleName = stripChapterPrefix(chapter.title);

  const startEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    setTitleDraft(titleName);
    setSceneDraft(chapter.scene);
    setEventDraft(chapter.event);
    setHookDraft(chapter.hook);
    setEditing(true);
  };

  const cancelEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    setEditing(false);
  };

  const saveEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    const title = titleDraft.trim();
    const scene = sceneDraft.trim();
    const eventText = eventDraft.trim();
    const hook = hookDraft.trim();
    if (!title || !scene || !eventText || !hook) return;
    onChange({ title, scene, event: eventText, hook });
    setEditing(false);
  };

  const canSave = Boolean(
    titleDraft.trim() && sceneDraft.trim() && eventDraft.trim() && hookDraft.trim(),
  );

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
              value={titleDraft}
              placeholder={CHAPTER_TITLE_PLACEHOLDER}
              onChange={(event) => setTitleDraft(event.target.value)}
            />
          </div>
          <Input.TextArea
            value={sceneDraft}
            placeholder={CHAPTER_SCENE_LABEL}
            autoSize={{ minRows: 3, maxRows: 8 }}
            onChange={(event) => setSceneDraft(event.target.value)}
          />
          <Input.TextArea
            value={eventDraft}
            placeholder={CHAPTER_EVENT_LABEL}
            autoSize={{ minRows: 3, maxRows: 8 }}
            onChange={(event) => setEventDraft(event.target.value)}
          />
          <Input
            value={hookDraft}
            placeholder={`${CHAPTER_HOOK_LABEL}（${CHAPTER_HOOK_HINT}）`}
            onChange={(event) => setHookDraft(event.target.value)}
          />
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
        <div className={styles.read}>
          <div className={styles.head}>
            <span className={styles.index}>{index}</span>
            <p className={styles.titleText}>
              {prefix}
              {titleName ? `　${titleName}` : ''}
            </p>
            <div className={styles.actions}>
              <Button type="link" size="small" className={styles.editButton} onClick={startEdit}>
                {EDIT_BUTTON}
              </Button>
              {removable ? (
                <Popconfirm
                  title={CHAPTER_DELETE_CONFIRM_TITLE}
                  okText={DELETE_BUTTON}
                  cancelText={CONFIRM_CANCEL}
                  okButtonProps={{ danger: true }}
                  onConfirm={onRemove}
                >
                  <Button type="text" danger size="small">
                    {DELETE_BUTTON}
                  </Button>
                </Popconfirm>
              ) : null}
            </div>
          </div>
          <div className={styles.fields}>
            <p className={styles.purposeLabel}>{CHAPTER_SCENE_LABEL}</p>
            <p className={styles.purposeText}>{chapter.scene}</p>
            <p className={styles.purposeLabel}>{CHAPTER_EVENT_LABEL}</p>
            <p className={styles.purposeText}>{chapter.event}</p>
            <p className={styles.purposeLabel}>{CHAPTER_HOOK_LABEL}</p>
            <p className={styles.purposeText}>{chapter.hook}</p>
          </div>
        </div>
      )}
    </Card>
  );
}
