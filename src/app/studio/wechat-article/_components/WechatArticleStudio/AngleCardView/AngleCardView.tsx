import { Card } from 'antd';
import {
  ANGLE_SLOT_CONFLICT_LABEL,
  ANGLE_SLOT_RISK_LABEL,
  ANGLE_SLOT_WHY_NOW_LABEL,
} from '../constants';
import type { AngleCard } from '../types';
import styles from './AngleCardView.module.css';

type AngleCardViewProps = {
  angle: AngleCard;
  selected?: boolean;
  /** 有回调时可点选；无回调时为只读展示。 */
  onSelect?: () => void;
};

/** 切入卡：调研步点选 / 思路步只读展示同一套 Card（四槽：切入/张力/读者理由/注意）。 */
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
      <p className={styles.meta}>
        {ANGLE_SLOT_CONFLICT_LABEL}：{angle.conflict}
      </p>
      <p className={styles.meta}>
        {ANGLE_SLOT_WHY_NOW_LABEL}：{angle.whyNow}
      </p>
      {angle.risk ? (
        <p className={styles.meta}>
          {ANGLE_SLOT_RISK_LABEL}：{angle.risk}
        </p>
      ) : null}
    </Card>
  );
}
