import type { ChaptersSnapshot, NovelPlan } from '../../types';
import { WRITE_UNITS_LABEL } from '../../constants';
import { formatChapterPrefix, stripChapterPrefix, visibleWritingChapters } from '../../utils';
import styles from './WritingUnitList.module.css';

type WritingUnitListProps = {
  plan: NovelPlan;
  chapters?: ChaptersSnapshot;
  selectedUnitIds: string[];
  focusUnitId?: string;
  onToggle: (unitId: string) => void;
};

/** 写作左栏：按卷列出章节，单选。 */
export default function WritingUnitList({
  plan,
  chapters,
  selectedUnitIds,
  focusUnitId,
  onToggle,
}: WritingUnitListProps) {
  const selected = new Set(selectedUnitIds);
  const list = visibleWritingChapters(plan, chapters);

  return (
    <div className={styles.root}>
      <div className={styles.label}>{WRITE_UNITS_LABEL}</div>
      <div className={styles.groups}>
        {list.map(({ chapter, number }) => {
          const titleName = stripChapterPrefix(chapter.title);
          const chapterLabel = `${formatChapterPrefix(number)}${titleName ? `　${titleName}` : ''}`;
          return (
            <button
              key={chapter.id}
              type="button"
              className={[
                styles.item,
                styles.chapterItem,
                selected.has(chapter.id) ? styles.selected : '',
                focusUnitId === chapter.id ? styles.focus : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onToggle(chapter.id)}
            >
              <span className={styles.itemText}>{chapterLabel}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
