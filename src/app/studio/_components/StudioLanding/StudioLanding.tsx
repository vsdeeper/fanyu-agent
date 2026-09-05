'use client';

import { Flex, Layout, Typography } from 'antd';
import ModeSwitch from '@/components/ModeSwitch';
import StudioCard from './StudioCard';
import { STUDIO_ENTRIES, STUDIO_TITLE } from './constants';
import styles from './StudioLanding.module.css';

/** 工作室落地页：以卡片陈列产品精修 / 产品模特 / 电商设计入口。 */
export default function StudioLanding() {
  return (
    <Layout className={styles.page}>
      <Layout.Header className={styles.header}>
        <Typography.Title level={5} className={styles.title}>
          {STUDIO_TITLE}
        </Typography.Title>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <Layout.Content className={styles.content}>
        <Flex wrap gap={16} align="flex-start">
          {STUDIO_ENTRIES.map((entry) => (
            <StudioCard key={entry.key} entry={entry} />
          ))}
        </Flex>
      </Layout.Content>
    </Layout>
  );
}
