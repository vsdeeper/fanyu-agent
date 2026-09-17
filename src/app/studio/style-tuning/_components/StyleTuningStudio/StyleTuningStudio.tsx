'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { StyleTuningTaskDetail } from '@/app/api/studio/style-tuning/_shared/task-types';
import { STYLE_TUNING_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import { useStyleTuningStudio } from './hooks/useStyleTuningStudio';
import styles from './StyleTuningStudio.module.css';

type StyleTuningStudioProps = {
  task: StyleTuningTaskDetail;
};

/** 文风调工作台：软调 → 试写。 */
export default function StyleTuningStudio({ task }: StyleTuningStudioProps) {
  const router = useRouter();
  const studio = useStyleTuningStudio(task);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回文风调任务列表"
          onClick={() => router.push(STYLE_TUNING_PATH)}
        />
        <div className={styles.brand}>
          <Typography.Title level={5} className={styles.title} ellipsis>
            {task.name}
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
            phase={studio.phase}
            publishScene={studio.publishScene}
            topicContent={studio.topicContent}
            stylePrompt={studio.stylePrompt}
            contentOutline={studio.contentOutline}
            onPublishSceneChange={studio.setPublishScene}
            onTopicContentChange={studio.setTopicContent}
            onStylePromptChange={studio.setStylePrompt}
            onContentOutlineChange={studio.setContentOutline}
            onSoftTune={studio.handleSoftTune}
            onTrialWrite={studio.handleTrialWrite}
          />
          <ResultPanel
            phase={studio.phase}
            softTuneStream={studio.softTuneStream}
            softParams={studio.softParams}
            onSoftParamSave={studio.saveSoftParam}
            trialStream={studio.trialStream}
            markdown={studio.markdown}
            navLoading={studio.navLoading}
            onPrev={studio.handlePrev}
            onNext={studio.handleNext}
          />
        </div>
      </Layout.Content>
    </Layout>
  );
}
