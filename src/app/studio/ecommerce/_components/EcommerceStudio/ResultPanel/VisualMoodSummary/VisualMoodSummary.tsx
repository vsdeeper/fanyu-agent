import { Card } from 'antd';
import { VISUAL_MOOD_SUMMARY_TITLE } from '@/app/api/studio/ecommerce/_shared/visual-mood';
import styles from './VisualMoodSummary.module.css';

type VisualMoodSummaryProps = {
  summary: string;
};

/**
 * 分析右栏主题卡上方的只读气质摘要；不参与点选。
 */
export default function VisualMoodSummary({ summary }: VisualMoodSummaryProps) {
  return (
    <Card size="small" title={VISUAL_MOOD_SUMMARY_TITLE} className={styles.card}>
      <p className={styles.body}>{summary}</p>
    </Card>
  );
}
