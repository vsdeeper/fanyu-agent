import type { StructureChapter } from '../../types';
import ChapterItem from './ChapterItem';
import styles from './ChapterList.module.css';

type ChapterListProps = {
  chapters: StructureChapter[];
  title: string;
  onChangeChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
};

/** 中长篇章纲列表：每章一张卡（标题 + 目的），「第N章」按序号自动生成。 */
export default function ChapterList({
  chapters,
  title,
  onChangeChapter,
  onRemoveChapter,
}: ChapterListProps) {
  if (!chapters.length) return null;
  const removable = chapters.length > 1;

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{title}</p>
      <div className={styles.list}>
        {chapters.map((chapter, index) => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            index={index + 1}
            removable={removable}
            onChange={(patch) => onChangeChapter(chapter.id, patch)}
            onRemove={() => onRemoveChapter(chapter.id)}
          />
        ))}
      </div>
    </div>
  );
}
