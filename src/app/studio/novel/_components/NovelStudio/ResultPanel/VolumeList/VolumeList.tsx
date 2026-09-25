import { Button, Card, Input, Popconfirm } from 'antd';
import { useState, type MouseEvent } from 'react';
import {
  CANCEL_BUTTON,
  DELETE_BUTTON,
  EDIT_BUTTON,
  SAVE_BUTTON,
} from '@/app/studio/_components/StudioCard/constants';
import {
  CHAPTERS_TITLE,
  VOLUME_CHAPTERS_BUTTON,
  VOLUME_CHAPTERS_EMPTY_HINT,
  VOLUME_CHAPTERS_LABEL,
  VOLUME_CHAPTERS_REGENERATE_BUTTON,
  VOLUME_DELETE_CONFIRM_TITLE,
  VOLUME_PURPOSE_LABEL,
  VOLUME_TITLE_PLACEHOLDER,
} from '../../constants';
import type { StructureVolume } from '../../types';
import ChapterList from '../ChapterList';
import styles from './VolumeList.module.css';

type VolumeItemProps = {
  volume: StructureVolume;
  index: number;
  chapterIndexOffset: number;
  removable: boolean;
  generatingChapters?: boolean;
  generatingChapterId?: string;
  onChange: (patch: { title?: string; purpose?: string }) => void;
  onRemove: () => void;
  onGenerateChapters: () => void;
  onChangeChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
  onGenerateChapterBeats: (chapterId: string) => void;
  onChangeChapterBeat: (chapterId: string, beatId: string, text: string) => void;
  onRemoveChapterBeat: (chapterId: string, beatId: string) => void;
};

/** 单卷卡片：卷标题/目的 + 生成章纲 + 嵌套章列表。 */
function VolumeItem({
  volume,
  index,
  chapterIndexOffset,
  removable,
  generatingChapters = false,
  generatingChapterId,
  onChange,
  onRemove,
  onGenerateChapters,
  onChangeChapter,
  onRemoveChapter,
  onGenerateChapterBeats,
  onChangeChapterBeat,
  onRemoveChapterBeat,
}: VolumeItemProps) {
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [purposeDraft, setPurposeDraft] = useState('');
  const hasChapters = volume.chapters.length > 0;

  const startEdit = (event?: MouseEvent) => {
    event?.stopPropagation();
    setTitleDraft(volume.title);
    setPurposeDraft(volume.purpose);
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
    <Card size="small" className={styles.volumeCard}>
      {editing ? (
        <div className={styles.editStack} onClick={(event) => event.stopPropagation()}>
          <div className={styles.titleEditRow}>
            <span className={styles.index} aria-hidden>
              {index}
            </span>
            <Input
              className={styles.titleInput}
              value={titleDraft}
              placeholder={VOLUME_TITLE_PLACEHOLDER}
              autoFocus
              onChange={(event) => setTitleDraft(event.target.value)}
            />
          </div>
          <div>
            <p className={styles.purposeLabel}>{VOLUME_PURPOSE_LABEL}</p>
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
                <p className={styles.titleText}>{volume.title}</p>
                <p className={styles.purposeLabel}>{VOLUME_PURPOSE_LABEL}</p>
                <p className={styles.purposeText}>{volume.purpose}</p>
              </div>
            </div>
            {removable ? (
              <span className={styles.displayActions} onClick={(event) => event.stopPropagation()}>
                <Popconfirm
                  title={VOLUME_DELETE_CONFIRM_TITLE}
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

          <div className={styles.chaptersBlock}>
            <div className={styles.chaptersHead}>
              <p className={styles.chaptersLabel}>{VOLUME_CHAPTERS_LABEL}</p>
              <Button
                type="link"
                size="small"
                className={styles.actionBtn}
                loading={generatingChapters}
                onClick={onGenerateChapters}
              >
                {hasChapters ? VOLUME_CHAPTERS_REGENERATE_BUTTON : VOLUME_CHAPTERS_BUTTON}
              </Button>
            </div>
            {hasChapters ? (
              <ChapterList
                chapters={volume.chapters}
                title=""
                embedded
                chapterIndexOffset={chapterIndexOffset}
                generatingChapterId={generatingChapterId}
                onChangeChapter={onChangeChapter}
                onRemoveChapter={onRemoveChapter}
                onGenerateChapterBeats={onGenerateChapterBeats}
                onChangeChapterBeat={onChangeChapterBeat}
                onRemoveChapterBeat={onRemoveChapterBeat}
              />
            ) : (
              <p className={styles.emptyHint}>{VOLUME_CHAPTERS_EMPTY_HINT}</p>
            )}
          </div>
        </>
      )}
    </Card>
  );
}

type VolumeListProps = {
  volumes: StructureVolume[];
  title: string;
  generatingVolumeId?: string;
  generatingChapterId?: string;
  onChangeVolume: (volumeId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveVolume: (volumeId: string) => void;
  onGenerateVolumeChapters: (volumeId: string) => void;
  onChangeChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
  onGenerateChapterBeats: (chapterId: string) => void;
  onChangeChapterBeat: (chapterId: string, beatId: string, text: string) => void;
  onRemoveChapterBeat: (chapterId: string, beatId: string) => void;
};

/** 长篇卷纲列表：每卷一张卡，内嵌章纲。 */
export default function VolumeList({
  volumes,
  title,
  generatingVolumeId,
  generatingChapterId,
  onChangeVolume,
  onRemoveVolume,
  onGenerateVolumeChapters,
  onChangeChapter,
  onRemoveChapter,
  onGenerateChapterBeats,
  onChangeChapterBeat,
  onRemoveChapterBeat,
}: VolumeListProps) {
  if (!volumes.length) return null;
  const removable = volumes.length > 1;

  let chapterOffset = 0;
  const offsets: number[] = [];
  for (const volume of volumes) {
    offsets.push(chapterOffset);
    chapterOffset += volume.chapters.length;
  }

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{title}</p>
      <div className={styles.list}>
        {volumes.map((volume, index) => (
          <VolumeItem
            key={volume.id}
            volume={volume}
            index={index + 1}
            chapterIndexOffset={offsets[index] ?? 0}
            removable={removable}
            generatingChapters={generatingVolumeId === volume.id}
            generatingChapterId={generatingChapterId}
            onChange={(patch) => onChangeVolume(volume.id, patch)}
            onRemove={() => onRemoveVolume(volume.id)}
            onGenerateChapters={() => onGenerateVolumeChapters(volume.id)}
            onChangeChapter={onChangeChapter}
            onRemoveChapter={onRemoveChapter}
            onGenerateChapterBeats={onGenerateChapterBeats}
            onChangeChapterBeat={onChangeChapterBeat}
            onRemoveChapterBeat={onRemoveChapterBeat}
          />
        ))}
      </div>
    </div>
  );
}

export type { StructureVolume };
