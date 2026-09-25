import { Button } from 'antd';
import { EMPTY_WRITE_HINT, WRITE_BUTTON, WRITE_CHAR_COUNT } from '../../constants';
import type { StructureSnapshot, WritingSnapshot } from '../../types';
import { buildWritingEditorBlocks, countTextChars } from '../../utils';
import BeatWritingCard from './BeatWritingCard';
import styles from './WritingEditor.module.css';

type WritingEditorProps = {
  structure: StructureSnapshot;
  writing: WritingSnapshot;
  selectedUnitIds: string[];
  generatingUnitIds: string[];
  onSaveBody: (unitId: string, body: string) => void;
  onGenerateWriting: (unitIds: string[]) => void;
};

/** 写作右栏：章 / 节拍嵌套；摘要与正文区分；卡片内生成正文。 */
export default function WritingEditor({
  structure,
  writing,
  selectedUnitIds,
  generatingUnitIds,
  onSaveBody,
  onGenerateWriting,
}: WritingEditorProps) {
  const blocks = buildWritingEditorBlocks(structure, writing, selectedUnitIds);
  const generatingSet = new Set(generatingUnitIds);
  const writingBusy = generatingUnitIds.length > 0;

  if (blocks.length === 0) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>{EMPTY_WRITE_HINT}</p>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      {blocks.map((block) => {
        if (block.type === 'short') {
          return (
            <div key="short" className={styles.block}>
              {block.beats.map((beat) => (
                <BeatWritingCard
                  key={beat.unitId}
                  index={beat.index}
                  summary={beat.summary}
                  body={beat.body}
                  generating={generatingSet.has(beat.unitId)}
                  writeBusy={writingBusy}
                  onSave={(value) => onSaveBody(beat.unitId, value)}
                  onGenerate={() => onGenerateWriting([beat.unitId])}
                />
              ))}
            </div>
          );
        }

        const chapterBeatIds = block.beats.map((beat) => beat.unitId);
        const chapterGenerating = chapterBeatIds.some((id) => generatingSet.has(id));
        const chapterCharCount = countTextChars(block.beats.map((beat) => beat.body).join(''));

        return (
          <div key={block.chapterId} className={styles.block}>
            <div className={styles.chapterHead}>
              <p className={styles.chapterTitle}>{block.chapterLabel}</p>
              <span className={styles.charCount}>{WRITE_CHAR_COUNT(chapterCharCount)}</span>
              <Button
                type="link"
                size="small"
                className={styles.generateBtn}
                loading={chapterGenerating}
                disabled={writingBusy || chapterBeatIds.length === 0}
                onClick={() => onGenerateWriting(chapterBeatIds)}
              >
                {WRITE_BUTTON}
              </Button>
            </div>
            <div className={styles.beatNest}>
              {block.beats.map((beat) => (
                <BeatWritingCard
                  key={beat.unitId}
                  index={beat.index}
                  summary={beat.summary}
                  body={beat.body}
                  generating={generatingSet.has(beat.unitId)}
                  writeBusy={writingBusy}
                  onSave={(value) => onSaveBody(beat.unitId, value)}
                  onGenerate={() => onGenerateWriting([beat.unitId])}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
