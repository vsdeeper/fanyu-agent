'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { ImageTextTaskDetail } from '@/app/api/studio/image-text/_shared/task-types';
import { IMAGE_TEXT_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel/ControlPanel';
import { STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import { useImageTextStudio } from './hooks/useImageTextStudio';
import PreviewPanel from './PreviewPanel/PreviewPanel';
import ResultPanel from './ResultPanel/ResultPanel';
import { buildPreviewSlides } from './utils';
import styles from './ImageTextStudio.module.css';

type ImageTextStudioProps = {
  task: ImageTextTaskDetail;
};

/** 图文工作台：图文内容 → 图文生成 → 预览。 */
export default function ImageTextStudio({ task }: ImageTextStudioProps) {
  const router = useRouter();
  const studio = useImageTextStudio(task);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回图文任务列表"
          onClick={() => router.push(IMAGE_TEXT_PATH)}
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
          {studio.phase === 'preview' ? (
            <PreviewPanel
              slides={buildPreviewSlides(studio.images)}
              caption={studio.caption}
              navLoading={studio.navLoading}
              onPrev={studio.handlePrev}
            />
          ) : (
            <>
              <ControlPanel
                form={studio.panelForm}
                initialValues={studio.panelInitialValues}
                phase={studio.phase}
                canGenerate={Boolean(studio.body.trim())}
                spec={studio.spec}
                generating={studio.generating}
                onSpecChange={studio.updateSpec}
                onPlan={studio.handlePlan}
                onGenerate={studio.handleGenerate}
              />
              <ResultPanel
                phase={studio.phase}
                streamText={studio.streamText}
                body={studio.body}
                images={studio.images}
                spec={studio.spec}
                generating={studio.generating}
                navLoading={studio.navLoading}
                onSaveBody={studio.saveBody}
                onToggleImage={studio.togglePreviewImage}
                onCancelGenerate={studio.cancelGenerate}
                onPrev={studio.handlePrev}
                onNext={studio.handleNext}
              />
            </>
          )}
        </div>
      </Layout.Content>
    </Layout>
  );
}
