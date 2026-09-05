'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import { STUDIO_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import { STUDIO_STEP_INDEX, STUDIO_STEPS, STUDIO_TITLE } from './constants';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { useProductRetouchStudio } from './hooks/useProductRetouchStudio';
import styles from './ProductRetouchStudio.module.css';

/** 产品精修与多视角生成工作台。 */
export default function ProductRetouchStudio() {
  const router = useRouter();
  const studio = useProductRetouchStudio();
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
        {studio.phase === 'complete' ? (
          <CompletionPanel
            refineImages={studio.refineImages}
            multiviewImages={studio.multiviewImages}
            onPrev={studio.handlePrev}
          />
        ) : (
          <>
            <ControlPanel
              phase={studio.phase}
              needsMultiview={studio.needsMultiview}
              images={studio.images}
              refineForm={studio.refineForm}
              multiviewForm={studio.multiviewForm}
              locked={studio.locked}
              onImagesAppend={studio.handleImagesAppend}
              onImageRemove={studio.handleImageRemove}
              onNeedsMultiviewChange={studio.setNeedsMultiview}
              onRefineFormChange={studio.setRefineForm}
              onMultiviewFormChange={studio.setMultiviewForm}
              onRefine={studio.handleRefine}
              onMultiview={studio.handleMultiview}
            />
            <ResultPanel
              phase={studio.phase}
              needsMultiview={studio.needsMultiview}
              refineImages={studio.refineImages}
              multiviewImages={studio.multiviewImages}
              refineExpectedCount={Number.parseInt(studio.refineForm.count, 10) || 1}
              multiviewExpectedCount={Number.parseInt(studio.multiviewForm.count, 10) || 1}
              refineAspectRatio={studio.refineForm.aspectRatio}
              multiviewAspectRatio={studio.multiviewForm.aspectRatio}
              selectedRefineIndex={studio.selectedRefineIndex}
              onSelectRefine={studio.setSelectedRefineIndex}
              onPrev={studio.handlePrev}
              onNext={studio.handleNext}
              onComplete={studio.handleComplete}
            />
          </>
        )}
      </Layout.Content>
    </Layout>
  );
}
