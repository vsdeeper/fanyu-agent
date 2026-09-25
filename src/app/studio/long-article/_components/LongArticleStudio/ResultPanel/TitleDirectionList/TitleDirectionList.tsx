import { TITLE_DIRECTIONS_TITLE } from '../../constants';
import TitleDirectionItem from './TitleDirectionItem';
import styles from './TitleDirectionList.module.css';

type TitleDirectionListProps = {
  titles: string[];
  selectedIndex?: number;
  onSelect: (index: number) => void;
  onChangeTitle: (index: number, value: string) => void;
};

/** 标题方向：置顶单选列表，选定项作为成稿标题。 */
export default function TitleDirectionList({
  titles,
  selectedIndex,
  onSelect,
  onChangeTitle,
}: TitleDirectionListProps) {
  if (!titles.length) return null;

  return (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{TITLE_DIRECTIONS_TITLE}</p>
      <div className={styles.list}>
        {titles.map((title, index) => (
          <TitleDirectionItem
            key={`title-${index}`}
            value={title}
            selected={selectedIndex === index}
            onSelect={() => onSelect(index)}
            onSave={(value) => onChangeTitle(index, value)}
          />
        ))}
      </div>
    </div>
  );
}
