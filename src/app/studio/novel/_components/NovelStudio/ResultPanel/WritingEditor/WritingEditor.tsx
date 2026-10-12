import { EMPTY_WRITE_HINT } from '../../constants';
import type { StructureSnapshot, WritingSnapshot } from '../../types';
import { buildWritingEditorBlocks } from '../../utils';
import WritingBodyCard from './WritingBodyCard';
import styles from './WritingEditor.module.css';

type WritingEditorProps = {
  structure: StructureSnapshot;
  writing: WritingSnapshot;
  selectedUnitIds: string[];
  generatingUnitIds: string[];
  polishingUnitId?: string;
  onSaveBody: (unitId: string, body: string) => void;
  onGenerateWriting: (unitIds: string[]) => void;
  onPolishWriting: (unitId: string) => void;
  onCopyWritingBody: (unitId: string) => void;
};

/** 写作右栏：一次只展示并编辑一篇或一章连续正文。 */
export default function WritingEditor({
  structure,
  writing,
  selectedUnitIds,
  generatingUnitIds,
  polishingUnitId,
  onSaveBody,
  onGenerateWriting,
  onPolishWriting,
  onCopyWritingBody,
}: WritingEditorProps) {
  const blocks = buildWritingEditorBlocks(structure, writing, selectedUnitIds);
  const generatingSet = new Set(generatingUnitIds);
  const writingBusy = generatingUnitIds.length > 0 || Boolean(polishingUnitId);

  if (blocks.length === 0) {
    return (
      <div className={styles.center}>
        <p className={styles.hint}>{EMPTY_WRITE_HINT}</p>
      </div>
    );
  }

  return (
    <div className={styles.editor}>
      {blocks.map((block) => (
        <WritingBodyCard
          key={block.unitId}
          label={block.label}
          body={block.body}
          generating={generatingSet.has(block.unitId)}
          polishing={polishingUnitId === block.unitId}
          writeBusy={writingBusy}
          canGenerate={block.canGenerate}
          onSave={(value) => onSaveBody(block.unitId, value)}
          onGenerate={() => onGenerateWriting([block.unitId])}
          onPolish={() => onPolishWriting(block.unitId)}
          onCopy={() => onCopyWritingBody(block.unitId)}
        />
      ))}
    </div>
  );
}
