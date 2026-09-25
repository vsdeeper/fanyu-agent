import { WRITE_CHAPTER_NO_BEATS_HINT, WRITE_UNITS_LABEL } from '../../constants';
import type { StructureSnapshot } from '../../types';
import { formatChapterPrefix, isChapterRowSelected, stripChapterPrefix } from '../../utils';
import styles from './WritingUnitList.module.css';

type WritingUnitListProps = {
  structure: StructureSnapshot;
  selectedUnitIds: string[];
  focusUnitId?: string;
  onToggle: (unitId: string) => void;
};

/** 写作左栏单元列表：短篇节拍多选；中长篇章单选、同章节拍可多选。 */
export default function WritingUnitList({
  structure,
  selectedUnitIds,
  focusUnitId,
  onToggle,
}: WritingUnitListProps) {
  const selected = new Set(selectedUnitIds);

  return (
    <div className={styles.root}>
      <div className={styles.label}>{WRITE_UNITS_LABEL}</div>
      {structure.kind === 'short' ? (
        <div className={styles.list}>
          {structure.beats.map((beat, index) => {
            const isSelected = selected.has(beat.id);
            const isFocus = isSelected && focusUnitId === beat.id;
            return (
              <button
                key={beat.id}
                type="button"
                className={[
                  styles.item,
                  isSelected ? styles.selected : '',
                  isFocus ? styles.focus : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onToggle(beat.id)}
              >
                <span className={styles.itemIndex}>{index + 1}</span>
                <span className={styles.itemText}>{beat.text}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className={styles.groups}>
          {structure.chapters.map((chapter, chapterIndex) => {
            const titleName = stripChapterPrefix(chapter.title);
            const chapterLabel = `${formatChapterPrefix(chapterIndex + 1)}${titleName ? `　${titleName}` : ''}`;
            const hasBeats = chapter.beats.length > 0;
            const chapterSelected = isChapterRowSelected(chapter, selectedUnitIds);
            const chapterFocus = chapterSelected && focusUnitId === chapter.id;
            return (
              <div key={chapter.id} className={styles.group}>
                <button
                  type="button"
                  disabled={!hasBeats}
                  className={[
                    styles.item,
                    styles.chapterItem,
                    !hasBeats ? styles.disabled : '',
                    chapterSelected ? styles.selected : '',
                    chapterFocus ? styles.focus : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onToggle(chapter.id)}
                >
                  <span className={styles.itemText}>{chapterLabel}</span>
                </button>
                {hasBeats ? (
                  <div className={styles.beatList}>
                    {chapter.beats.map((beat, beatIndex) => {
                      const isSelected = selected.has(beat.id);
                      const isFocus = isSelected && focusUnitId === beat.id;
                      return (
                        <button
                          key={beat.id}
                          type="button"
                          className={[
                            styles.item,
                            styles.beatItem,
                            isSelected ? styles.selected : '',
                            isFocus ? styles.focus : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={() => onToggle(beat.id)}
                        >
                          <span className={styles.itemIndex}>{beatIndex + 1}</span>
                          <span className={styles.itemText}>{beat.text}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.hint}>{WRITE_CHAPTER_NO_BEATS_HINT}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
