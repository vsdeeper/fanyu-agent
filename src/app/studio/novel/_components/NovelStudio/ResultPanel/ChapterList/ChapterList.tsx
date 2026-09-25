import type { StructureChapter } from '../../types';
import ChapterItem from './ChapterItem';
import styles from './ChapterList.module.css';

type ChapterListProps = {
  chapters: StructureChapter[];
  title: string;
  generatingChapterId?: string;
  onChangeChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
  onGenerateChapterBeats: (chapterId: string) => void;
  onChangeChapterBeat: (chapterId: string, beatId: string, text: string) => void;
  onRemoveChapterBeat: (chapterId: string, beatId: string) => void;
};

/** 中长篇章纲列表：每章一张卡（标题 + 目的 + 按需节拍）。 */
export default function ChapterList({
  chapters,
  title,
  generatingChapterId,
  onChangeChapter,
  onRemoveChapter,
  onGenerateChapterBeats,
  onChangeChapterBeat,
  onRemoveChapterBeat,
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
            generatingBeats={generatingChapterId === chapter.id}
            onChange={(patch) => onChangeChapter(chapter.id, patch)}
            onRemove={() => onRemoveChapter(chapter.id)}
            onGenerateBeats={() => onGenerateChapterBeats(chapter.id)}
            onChangeBeat={(beatId, text) => onChangeChapterBeat(chapter.id, beatId, text)}
            onRemoveBeat={(beatId) => onRemoveChapterBeat(chapter.id, beatId)}
          />
        ))}
      </div>
    </div>
  );
}
