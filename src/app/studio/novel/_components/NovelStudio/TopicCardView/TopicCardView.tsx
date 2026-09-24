import SelectableCard from '@/app/studio/_components/SelectableCard';
import {
  TOPIC_SLOT_CORE_LABEL,
  TOPIC_SLOT_GENRE_VOLUME_LABEL,
  TOPIC_SLOT_RISK_LABEL,
  TOPIC_SLOT_WHY_LABEL,
} from '../constants';
import type { TopicCard } from '../types';

type TopicCardViewProps = {
  topic: TopicCard;
  selected?: boolean;
  /** 有回调时可点选；无回调时为只读展示。 */
  onSelect?: () => void;
};

/** 选题卡：调研步点选（类型体量 / 值得写 / 故事核 / 风险）。 */
export default function TopicCardView({ topic, selected = false, onSelect }: TopicCardViewProps) {
  const interactive = Boolean(onSelect);
  const metaItems = [
    { label: TOPIC_SLOT_GENRE_VOLUME_LABEL, value: topic.genreVolume },
    { label: TOPIC_SLOT_WHY_LABEL, value: topic.why },
    { label: TOPIC_SLOT_CORE_LABEL, value: topic.core },
    ...(topic.risk ? [{ label: TOPIC_SLOT_RISK_LABEL, value: topic.risk }] : []),
  ];

  return (
    <SelectableCard
      selected={selected}
      interactive={interactive}
      title={<span title={topic.title}>{topic.title}</span>}
      onClick={onSelect}
      metaItems={metaItems}
    />
  );
}
