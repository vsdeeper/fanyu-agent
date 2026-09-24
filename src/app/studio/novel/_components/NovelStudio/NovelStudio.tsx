'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { STUDIO_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { STUDIO_STEP_INDEX, STUDIO_STEPS, STUDIO_TITLE } from './constants';
import { useNovelStudio } from './hooks/useNovelStudio';
import styles from './NovelStudio.module.css';

/** 小说写作工作台（静态）：选题调研 → 故事结构。 */
export default function NovelStudio() {
  const router = useRouter();
  const studio = useNovelStudio();

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回工作室"
          onClick={() => router.push(STUDIO_PATH)}
        />
        <div className={styles.brand}>
          <Typography.Title level={5} className={styles.title} ellipsis>
            {STUDIO_TITLE}
          </Typography.Title>
        </div>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <div className={styles.stepsRow}>
        <Steps
          className={styles.steps}
          current={STUDIO_STEP_INDEX[studio.phase]}
          size="small"
          items={STUDIO_STEPS}
        />
      </div>
      <Layout.Content className={styles.content}>
        <div className={styles.workspace}>
          <ControlPanel
            form={studio.panelForm}
            initialValues={studio.panelInitialValues}
            phase={studio.phase}
            selectedTopic={studio.selectedTopic}
            onResearch={studio.handleResearch}
            onGenerateStructure={studio.handleGenerateStructure}
          />
          <ResultPanel
            phase={studio.phase}
            topics={studio.topics}
            selectedTopicId={studio.selectedTopicId}
            structure={studio.structure}
            onSelectTopic={studio.handleSelectTopic}
            onPrev={studio.handlePrev}
            onNext={studio.handleNext}
            onUpdateSynopsis={studio.updateSynopsis}
            onUpdateBeat={studio.updateBeat}
            onRemoveBeat={studio.removeBeat}
            onUpdateChapter={studio.updateChapter}
            onRemoveChapter={studio.removeChapter}
          />
        </div>
      </Layout.Content>
    </Layout>
  );
}
