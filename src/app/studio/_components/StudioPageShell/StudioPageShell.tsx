import type { ReactNode } from 'react';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { STUDIO_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import styles from './StudioPageShell.module.css';

type StudioPageShellProps = {
  title: string;
  children: ReactNode;
};

/** 工作室列表页壳：返回工作室、标题与主题切换。 */
export default function StudioPageShell({ title, children }: StudioPageShellProps) {
  const router = useRouter();
  return (
    <Layout className={styles.page}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回工作室"
          onClick={() => router.push(STUDIO_PATH)}
        />
        <Typography.Title level={5} className={styles.title}>
          {title}
        </Typography.Title>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <Layout.Content className={styles.content}>{children}</Layout.Content>
    </Layout>
  );
}
