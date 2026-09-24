import SelectableCard from '@/app/studio/_components/SelectableCard';
import { BEAT_DELETE_CONFIRM_TITLE } from '../../constants';
import type { StructureBeat } from '../../types';
import styles from './BeatList.module.css';

type BeatListProps = {
  beats: StructureBeat[];
  title: string;
  onChangeBeat: (beatId: string, text: string) => void;
  onRemoveBeat: (beatId: string) => void;
};

/** 短篇节拍列表：可编辑 / 删除，至少保留一条。 */
export default function BeatList({ beats, title, onChangeBeat, onRemoveBeat }: BeatListProps) {
  if (!beats.length) return null;
  const removable = beats.length > 1;

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{title}</p>
      <div className={styles.list}>
        {beats.map((beat, index) => (
          <SelectableCard
            key={beat.id}
            editable
            index={index + 1}
            value={beat.text}
            onSave={(value) => onChangeBeat(beat.id, value)}
            removable={removable}
            onRemove={() => onRemoveBeat(beat.id)}
            deleteConfirmTitle={BEAT_DELETE_CONFIRM_TITLE}
          />
        ))}
      </div>
    </div>
  );
}
