import { Button, Card, Popconfirm } from 'antd';
import {
  CONFIRM_CANCEL,
  CONFIRM_OK,
  VOLUME_CHAPTERS_BUTTON,
  VOLUME_CHAPTERS_EMPTY_HINT,
  VOLUME_CHAPTERS_LABEL,
  VOLUME_CHAPTERS_REGENERATE_BUTTON,
  VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT,
  VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE,
  VOLUME_CONFLICT_LABEL,
  VOLUME_GEOGRAPHY_LABEL,
  VOLUME_TARGET_CHARS_LABEL,
  VOLUMES_TITLE,
} from '../../constants';
import type { ChaptersSnapshot, NovelPlan, StructureChapter } from '../../types';
import ChapterList from '../ChapterList';
import styles from './VolumeList.module.css';

type VolumeListProps = {
  plan: NovelPlan;
  chapters?: ChaptersSnapshot;
  generatingVolumeId?: string;
  onGenerateChapters: (volumeId: string) => void;
  onChangeChapter: (
    chapterId: string,
    patch: Partial<Pick<StructureChapter, 'title' | 'scene' | 'event' | 'hook'>>,
  ) => void;
  onRemoveChapter: (chapterId: string) => void;
};

/** 卷章设计：按创作方案的卷展示章卡，一卷一次出齐。 */
export default function VolumeList({
  plan,
  chapters,
  generatingVolumeId,
  onGenerateChapters,
  onChangeChapter,
  onRemoveChapter,
}: VolumeListProps) {
  const chapterCounts = plan.volumes.map(
    (volume) => chapters?.volumes.find((item) => item.id === volume.id)?.chapters.length ?? 0,
  );
  const offsets = chapterCounts.map((_, index) =>
    chapterCounts.slice(0, index).reduce((sum, count) => sum + count, 0),
  );

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{VOLUMES_TITLE}</p>
      <div className={styles.list}>
        {plan.volumes.map((volume, index) => {
          const volumeChapters =
            chapters?.volumes.find((item) => item.id === volume.id)?.chapters ?? [];
          const chapterIndexOffset = offsets[index] ?? 0;
          const hasChapters = volumeChapters.length > 0;
          const generating = generatingVolumeId === volume.id;
          return (
            <Card key={volume.id} size="small" className={styles.volumeCard}>
              <div className={styles.displayRow}>
                <span className={styles.index}>{index + 1}</span>
                <div className={styles.bodyStack}>
                  <p className={styles.titleText}>{volume.title}</p>
                  <p className={styles.purposeLabel}>{VOLUME_GEOGRAPHY_LABEL}</p>
                  <p className={styles.purposeText}>{volume.geography}</p>
                  <p className={styles.purposeLabel}>{VOLUME_CONFLICT_LABEL}</p>
                  <p className={styles.purposeText}>{volume.conflict}</p>
                  <p className={styles.purposeLabel}>{VOLUME_TARGET_CHARS_LABEL}</p>
                  <p className={styles.purposeText}>{volume.targetChars}</p>
                </div>
              </div>
              <div className={styles.chaptersBlock}>
                <div className={styles.chaptersHead}>
                  <p className={styles.chaptersLabel}>{VOLUME_CHAPTERS_LABEL}</p>
                  {hasChapters ? (
                    <Popconfirm
                      title={VOLUME_CHAPTERS_REGENERATE_CONFIRM_TITLE}
                      description={VOLUME_CHAPTERS_REGENERATE_CONFIRM_CONTENT}
                      okText={CONFIRM_OK}
                      cancelText={CONFIRM_CANCEL}
                      onConfirm={() => onGenerateChapters(volume.id)}
                    >
                      <Button size="small" loading={generating}>
                        {VOLUME_CHAPTERS_REGENERATE_BUTTON}
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button
                      size="small"
                      type="primary"
                      loading={generating}
                      onClick={() => onGenerateChapters(volume.id)}
                    >
                      {VOLUME_CHAPTERS_BUTTON}
                    </Button>
                  )}
                </div>
                {hasChapters ? (
                  <ChapterList
                    chapters={volumeChapters}
                    title=""
                    embedded
                    chapterIndexOffset={chapterIndexOffset}
                    onChangeChapter={onChangeChapter}
                    onRemoveChapter={onRemoveChapter}
                  />
                ) : (
                  <p className={styles.emptyHint}>{VOLUME_CHAPTERS_EMPTY_HINT}</p>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
