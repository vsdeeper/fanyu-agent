'use client';

import { Card } from 'antd';
import { useRouter } from 'next/navigation';
import type { StudioEntry } from '../types';
import styles from './StudioCard.module.css';

/**
 * 工作室落地页卡片：展示功能入口，点击跳转到对应页面。
 * @param entry 功能条目（标题 / 说明 / 跳转路径 / 图标）。
 */
export default function StudioCard({ entry }: { entry: StudioEntry }) {
  const router = useRouter();
  const Icon = entry.icon;

  return (
    <Card
      hoverable
      className={styles.card}
      variant="borderless"
      onClick={() => router.push(entry.path)}
    >
      <div className={styles.body}>
        <span className={styles.icon}>
          <Icon />
        </span>
        <div className={styles.contentWrapper}>
          <div className={styles.title}>{entry.title}</div>
          <div className={styles.description} title={entry.description}>
            {entry.description}
          </div>
        </div>
      </div>
    </Card>
  );
}
