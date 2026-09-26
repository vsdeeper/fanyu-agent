import StudioCard from '@/app/studio/_components/StudioCard';
import {
  ANGLE_SLOT_CONFLICT_LABEL_BY_GENRE,
  ANGLE_SLOT_RISK_LABEL,
  ANGLE_SLOT_WHY_NOW_LABEL,
} from '../constants';
import type { AngleCard, LongArticleGenre } from '../types';

type AngleCardViewProps = {
  angle: AngleCard;
  articleGenre: LongArticleGenre;
  selected?: boolean;
  /** 有回调时可点选；无回调时为只读展示。 */
  onSelect?: () => void;
};

/** 切入卡：调研步点选 / 思路步只读展示同一套 Card（四槽：切入/卡点或张力或处境/读者理由/注意）。 */
export default function AngleCardView({
  angle,
  articleGenre,
  selected = false,
  onSelect,
}: AngleCardViewProps) {
  const interactive = Boolean(onSelect);
  const conflictLabel = ANGLE_SLOT_CONFLICT_LABEL_BY_GENRE[articleGenre];
  const metaItems = [
    { label: conflictLabel, value: angle.conflict },
    { label: ANGLE_SLOT_WHY_NOW_LABEL, value: angle.whyNow },
    ...(angle.risk ? [{ label: ANGLE_SLOT_RISK_LABEL, value: angle.risk }] : []),
  ];

  return (
    <StudioCard
      selected={selected}
      interactive={interactive}
      title={<span title={angle.claim}>{angle.claim}</span>}
      onClick={onSelect}
      metaItems={metaItems}
    />
  );
}
