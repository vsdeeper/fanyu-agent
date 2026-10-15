import { Button, Card, Popconfirm } from 'antd';
import { characterNameById } from '@/app/api/studio/novel/_shared/character-ids';
import {
  CONFIRM_CANCEL,
  CONFIRM_OK,
  EMPTY_FIELD_TEXT,
  VOLUME_BEATS_LABEL,
  VOLUME_CHAPTERS_BUTTON,
  VOLUME_CHAPTERS_EMPTY_HINT,
  VOLUME_CHAPTERS_LABEL,
  VOLUME_CHAPTERS_REGENERATE_BUTTON,
  VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT,
  VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE,
  VOLUME_CONFLICT_LABEL,
  VOLUME_HOOK_LABEL,
  VOLUMES_POINT_HINT,
} from '../../constants';
import type { NovelCharacter, NovelVolumeDesign, StructureChapter } from '../../types';
import ChapterList from '../ChapterList';
import styles from './VolumeChapters.module.css';

type VolumeChaptersProps = {
  volume: NovelVolumeDesign;
  characters: NovelCharacter[];
  chapters: StructureChapter[];
  generating?: boolean;
  onGenerateChapters: () => void;
  onChangeChapter: (
    chapterId: string,
    patch: Partial<Pick<StructureChapter, 'title' | 'scene' | 'event' | 'hook'>>,
  ) => void;
  onRemoveChapter: (chapterId: string) => void;
};

/** 卷章设计：只展示卷纲里点选的那一卷，一次出齐本卷章卡。 */
export default function VolumeChapters({
  volume,
  characters,
  chapters,
  generating = false,
  onGenerateChapters,
  onChangeChapter,
  onRemoveChapter,
}: VolumeChaptersProps) {
  const hasChapters = chapters.length > 0;

  return (
    <div className={styles.section}>
      <Card size="small" className={styles.volumeCard}>
        <div className={styles.head}>
          <p className={styles.title}>{volume.title || EMPTY_FIELD_TEXT}</p>
          <p className={styles.pointHint}>{VOLUMES_POINT_HINT}</p>
        </div>
        <p className={styles.fieldLabel}>{VOLUME_CONFLICT_LABEL}</p>
        <p className={styles.readText}>{volume.conflict || EMPTY_FIELD_TEXT}</p>
        <p className={styles.fieldLabel}>{VOLUME_HOOK_LABEL}</p>
        <p className={styles.readText}>{volume.hook || EMPTY_FIELD_TEXT}</p>
        <p className={styles.fieldLabel}>{VOLUME_BEATS_LABEL}</p>
        {volume.beats.length > 0 ? (
          volume.beats.map((beat, index) => {
            const who = beat.characterIds
              .map((id) => characterNameById(id, characters))
              .filter(Boolean)
              .join('、');
            return (
              <div key={beat.id} className={styles.beat}>
                <p className={styles.beatTitle}>
                  {index + 1}. {beat.title || EMPTY_FIELD_TEXT}
                  {who ? `（${who}）` : ''}
                </p>
                <p className={styles.readText}>{beat.event}</p>
              </div>
            );
          })
        ) : (
          <p className={styles.readText}>{EMPTY_FIELD_TEXT}</p>
        )}
      </Card>

      <div className={styles.chaptersBlock}>
        <div className={styles.chaptersHead}>
          <p className={styles.chaptersLabel}>{VOLUME_CHAPTERS_LABEL}</p>
          {hasChapters ? (
            <Popconfirm
              title={VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE}
              description={VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT}
              okText={CONFIRM_OK}
              cancelText={CONFIRM_CANCEL}
              onConfirm={onGenerateChapters}
            >
              <Button size="small" type="link" loading={generating}>
                {VOLUME_CHAPTERS_REGENERATE_BUTTON}
              </Button>
            </Popconfirm>
          ) : (
            <Button size="small" type="primary" loading={generating} onClick={onGenerateChapters}>
              {VOLUME_CHAPTERS_BUTTON}
            </Button>
          )}
        </div>
        {hasChapters ? (
          <ChapterList
            chapters={chapters}
            title=""
            onChangeChapter={onChangeChapter}
            onRemoveChapter={onRemoveChapter}
          />
        ) : (
          <p className={styles.emptyHint}>{VOLUME_CHAPTERS_EMPTY_HINT}</p>
        )}
      </div>
    </div>
  );
}
