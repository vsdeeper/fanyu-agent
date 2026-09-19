import BeatItem from './BeatItem';
import styles from './BeatList.module.css';

type BeatListProps = {
  beats: string[];
  onChangeBeat: (index: number, value: string) => void;
  onRemoveBeat: (index: number) => void;
};

/** 写作要点列表：Card 纯文本 + 行内编辑；至少保留一条（beats 为空会让思路快照读不回来）。 */
export default function BeatList({ beats, onChangeBeat, onRemoveBeat }: BeatListProps) {
  if (!beats.length) return null;
  const removable = beats.length > 1;

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>写作要点</p>
      <div className={styles.list}>
        {beats.map((beat, index) => (
          <BeatItem
            key={`beat-${index}`}
            index={index}
            value={beat}
            removable={removable}
            onSave={(value) => onChangeBeat(index, value)}
            onRemove={() => onRemoveBeat(index)}
          />
        ))}
      </div>
    </div>
  );
}
