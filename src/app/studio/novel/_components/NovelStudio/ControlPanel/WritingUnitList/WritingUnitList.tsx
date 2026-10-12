import { CaretDownOutlined, CaretRightOutlined } from '@ant-design/icons';
import { useState, type MouseEvent } from 'react';
import {
  SHORT_WRITING_UNIT_ID,
  WRITE_CHAPTER_NO_BEATS_HINT,
  WRITE_UNITS_LABEL,
} from '../../constants';
import type { StructureSnapshot } from '../../types';
import {
  expandedChapterIds,
  formatChapterPrefix,
  isChapterRowSelected,
  listStructureChapters,
  stripChapterPrefix,
} from '../../utils';
import styles from './WritingUnitList.module.css';

type WritingUnitListProps = {
  structure: StructureSnapshot;
  selectedUnitIds: string[];
  focusUnitId?: string;
  onToggle: (unitId: string) => void;
};

/** 写作左栏：整篇或章节单选；节拍只读展示，不参与选中与生成。 */
export default function WritingUnitList({
  structure,
  selectedUnitIds,
  focusUnitId,
  onToggle,
}: WritingUnitListProps) {
  const selected = new Set(selectedUnitIds);
  const chapters = structure.kind === 'short' ? [] : listStructureChapters(structure);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(expandedChapterIds(structure, selectedUnitIds)),
  );

  const toggleExpanded = (chapterId: string, event: MouseEvent) => {
    event.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.label}>{WRITE_UNITS_LABEL}</div>
      {structure.kind === 'short' ? (
        <div className={styles.group}>
          <button
            type="button"
            className={[
              styles.item,
              styles.chapterItem,
              selected.has(SHORT_WRITING_UNIT_ID) ? styles.selected : '',
              focusUnitId === SHORT_WRITING_UNIT_ID ? styles.focus : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onToggle(SHORT_WRITING_UNIT_ID)}
          >
            <span className={styles.itemText}>整篇正文</span>
          </button>
          <div className={styles.beatList}>
            {structure.beats.map((beat, index) => (
              <div key={beat.id} className={styles.readonlyBeat}>
                <span className={styles.itemIndex}>{index + 1}</span>
                <span className={styles.itemText}>{beat.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.groups}>
          {chapters.map((chapter, chapterIndex) => {
            const titleName = stripChapterPrefix(chapter.title);
            const chapterLabel = `${formatChapterPrefix(chapterIndex + 1)}${titleName ? `　${titleName}` : ''}`;
            const hasBeats = chapter.beats.length > 0;
            const chapterSelected = isChapterRowSelected(chapter, selectedUnitIds);
            const chapterFocus = chapterSelected && focusUnitId === chapter.id;
            const expanded = expandedIds.has(chapter.id);
            return (
              <div key={chapter.id} className={styles.group}>
                <div
                  className={[
                    styles.chapterRow,
                    chapterSelected ? styles.selected : '',
                    chapterFocus ? styles.focus : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className={styles.expandBtn}
                    aria-expanded={expanded}
                    aria-label={expanded ? '折叠本章' : '展开本章'}
                    onClick={(event) => toggleExpanded(chapter.id, event)}
                  >
                    {expanded ? <CaretDownOutlined /> : <CaretRightOutlined />}
                  </button>
                  <button
                    type="button"
                    className={styles.chapterTitleBtn}
                    onClick={() => onToggle(chapter.id)}
                  >
                    <span className={styles.itemText}>{chapterLabel}</span>
                  </button>
                </div>
                {expanded ? (
                  hasBeats ? (
                    <div className={styles.beatList}>
                      {chapter.beats.map((beat, beatIndex) => {
                        return (
                          <div key={beat.id} className={styles.readonlyBeat}>
                            <span className={styles.itemIndex}>{beatIndex + 1}</span>
                            <span className={styles.itemText}>{beat.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className={styles.hint}>{WRITE_CHAPTER_NO_BEATS_HINT}</p>
                  )
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
