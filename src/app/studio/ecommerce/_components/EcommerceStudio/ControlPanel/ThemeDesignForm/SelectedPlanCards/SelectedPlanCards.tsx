import { Card } from 'antd';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import styles from './SelectedPlanCards.module.css';

type SelectedPlanCardsProps = {
  cards: ThemePlanCard[];
};

/**
 * 设计左栏已选主题：只读 Card，不点选、不编辑。
 */
export default function SelectedPlanCards({ cards }: SelectedPlanCardsProps) {
  return (
    <div className={styles.list}>
      {cards.map((card) => (
        <Card key={card.themeId} size="small" title={card.title} className={styles.card}>
          <p className={styles.body}>{card.requirement}</p>
        </Card>
      ))}
    </div>
  );
}
