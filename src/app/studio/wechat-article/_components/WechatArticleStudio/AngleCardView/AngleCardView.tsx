import SelectableCard from '@/app/studio/_components/SelectableCard';
import {
  ANGLE_SLOT_CONFLICT_LABEL,
  ANGLE_SLOT_RISK_LABEL,
  ANGLE_SLOT_WHY_NOW_LABEL,
} from '../constants';
import type { AngleCard } from '../types';

type AngleCardViewProps = {
  angle: AngleCard;
  selected?: boolean;
  /** 有回调时可点选；无回调时为只读展示。 */
  onSelect?: () => void;
};

/** 切入卡：调研步点选 / 思路步只读展示同一套 Card（四槽：切入/张力/读者理由/注意）。 */
export default function AngleCardView({ angle, selected = false, onSelect }: AngleCardViewProps) {
  const interactive = Boolean(onSelect);
  const metaItems = [
    { label: ANGLE_SLOT_CONFLICT_LABEL, value: angle.conflict },
    { label: ANGLE_SLOT_WHY_NOW_LABEL, value: angle.whyNow },
    ...(angle.risk ? [{ label: ANGLE_SLOT_RISK_LABEL, value: angle.risk }] : []),
  ];

  return (
    <SelectableCard
      selected={selected}
      interactive={interactive}
      title={<span title={angle.claim}>{angle.claim}</span>}
      onClick={onSelect}
      metaItems={metaItems}
    />
  );
}
