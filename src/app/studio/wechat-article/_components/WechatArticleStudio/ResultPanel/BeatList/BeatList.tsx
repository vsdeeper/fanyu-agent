import BeatItem from './BeatItem';
import styles from './BeatList.module.css';

type BeatListProps = {
  beats: string[];
  onChangeBeat: (index: number, value: string) => void;
};

/** 写作要点列表：Card 纯文本 + 行内编辑。 */
export default function BeatList({ beats, onChangeBeat }: BeatListProps) {
  if (!beats.length) return null;

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>写作要点</p>
      <div className={styles.list}>
        {beats.map((beat, index) => (
          <BeatItem
            key={`beat-${index}`}
            index={index}
            value={beat}
            onSave={(value) => onChangeBeat(index, value)}
          />
        ))}
      </div>
    </div>
  );
}
