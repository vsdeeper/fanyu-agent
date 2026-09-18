import { Card } from 'antd';
import type { AngleCard } from '../types';
import styles from './AngleCardView.module.css';

type AngleCardViewProps = {
  angle: AngleCard;
  selected?: boolean;
  /** 有回调时可点选；无回调时为只读展示。 */
  onSelect?: () => void;
};

/** 角度卡：调研步点选 / 思路步只读展示同一套 Card。 */
export default function AngleCardView({ angle, selected = false, onSelect }: AngleCardViewProps) {
  const interactive = Boolean(onSelect);
  return (
    <Card
      size="small"
      hoverable={interactive}
      className={`${styles.card} ${selected ? styles.selected : ''} ${interactive ? styles.interactive : ''}`}
      title={<span title={angle.claim}>{angle.claim}</span>}
      onClick={onSelect}
    >
      <p className={styles.meta}>冲突：{angle.conflict}</p>
      <p className={styles.meta}>为何现在：{angle.whyNow}</p>
      {angle.risk ? <p className={styles.meta}>风险：{angle.risk}</p> : null}
    </Card>
  );
}
