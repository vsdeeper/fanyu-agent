import type { StructureChapter } from '../../types';
import ChapterItem from './ChapterItem';
import styles from './ChapterList.module.css';

type ChapterListProps = {
  chapters: StructureChapter[];
  title: string;
  chapterIndexOffset?: number;
  embedded?: boolean;
  onChangeChapter: (
    chapterId: string,
    patch: Partial<Pick<StructureChapter, 'title' | 'scene' | 'event' | 'hook'>>,
  ) => void;
  onRemoveChapter: (chapterId: string) => void;
};

/** 一节的章卡列表。 */
export default function ChapterList({
  chapters,
  title,
  chapterIndexOffset = 0,
  embedded = false,
  onChangeChapter,
  onRemoveChapter,
}: ChapterListProps) {
  if (!chapters.length) return null;
  const removable = chapters.length > 1;

  return (
    <div className={styles.section}>
      {title ? <p className={styles.sectionTitle}>{title}</p> : null}
      <div className={styles.list}>
        {chapters.map((chapter, index) => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            index={chapterIndexOffset + index + 1}
            removable={removable}
            embedded={embedded}
            onChange={(patch) => onChangeChapter(chapter.id, patch)}
            onRemove={() => onRemoveChapter(chapter.id)}
          />
        ))}
      </div>
    </div>
  );
}
