import SelectableCard from '@/app/studio/_components/SelectableCard';
import { CHAPTER_DELETE_CONFIRM_TITLE, CHAPTER_PURPOSE_LABEL } from '../../constants';
import type { StructureChapter } from '../../types';
import styles from './ChapterList.module.css';

type ChapterListProps = {
  chapters: StructureChapter[];
  title: string;
  onChangeChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
};

/** 中长篇章纲列表：标题与本章目的可编辑，至少保留一章。 */
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
          <div key={chapter.id} className={styles.chapter}>
            <SelectableCard
              editable
              index={index + 1}
              value={chapter.title}
              onSave={(value) => onChangeChapter(chapter.id, { title: value })}
              removable={removable}
              onRemove={() => onRemoveChapter(chapter.id)}
              deleteConfirmTitle={CHAPTER_DELETE_CONFIRM_TITLE}
            />
            <SelectableCard
              editable
              title={CHAPTER_PURPOSE_LABEL}
              value={chapter.purpose}
              onSave={(value) => onChangeChapter(chapter.id, { purpose: value })}
              textareaRows={3}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
