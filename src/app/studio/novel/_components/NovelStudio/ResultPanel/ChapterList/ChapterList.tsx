import type { StructureChapter } from '../../types';
import ChapterItem from './ChapterItem';
import styles from './ChapterList.module.css';

type ChapterListProps = {
  chapters: StructureChapter[];
  title: string;
  /** 全书章序号起始偏移（0-based 已占用章数）；跨卷连续编号。 */
  chapterIndexOffset?: number;
  /** 嵌套在卷卡内时与卷纲序号左缘对齐。 */
  embedded?: boolean;
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
  chapterIndexOffset = 0,
  embedded = false,
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
      {title ? <p className={styles.sectionTitle}>{title}</p> : null}
      <div className={styles.list}>
        {chapters.map((chapter, index) => (
          <ChapterItem
            key={chapter.id}
            chapter={chapter}
            index={chapterIndexOffset + index + 1}
            removable={removable}
            embedded={embedded}
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
