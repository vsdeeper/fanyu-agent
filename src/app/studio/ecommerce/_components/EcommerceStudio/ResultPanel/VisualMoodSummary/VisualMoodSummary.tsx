import { VISUAL_MOOD_SUMMARY_TITLE } from '@/app/api/studio/ecommerce/_shared/visual-mood';
import StudioCard from '@/app/studio/_components/StudioCard';

type VisualMoodSummaryProps = {
  summary: string;
};

/**
 * 分析右栏主题卡上方的只读气质摘要；不参与点选。
 */
export default function VisualMoodSummary({ summary }: VisualMoodSummaryProps) {
  return <StudioCard title={VISUAL_MOOD_SUMMARY_TITLE} value={summary} />;
}
