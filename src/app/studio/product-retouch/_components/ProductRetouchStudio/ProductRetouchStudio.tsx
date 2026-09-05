'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { ProductRetouchTaskDetail } from '@/app/api/product-retouch/_shared/task-types';
import { PRODUCT_RETOUCH_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import { STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { useProductRetouchStudio } from './hooks/useProductRetouchStudio';
import { hasReadyImage } from './utils';
import styles from './ProductRetouchStudio.module.css';

type ProductRetouchStudioProps = {
  task: ProductRetouchTaskDetail;
};

/** 产品精修与多视角生成工作台。 */
export default function ProductRetouchStudio({ task }: ProductRetouchStudioProps) {
  const router = useRouter();
  const studio = useProductRetouchStudio(task);
  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回产品精修任务列表"
          onClick={() => router.push(PRODUCT_RETOUCH_PATH)}
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
              hasRefineResult={hasReadyImage(studio.refineImages)}
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
              persisting={studio.persisting}
              refineImages={studio.refineImages}
              multiviewImages={studio.multiviewImages}
              refineExpectedCount={Number.parseInt(studio.refineForm.count, 10) || 1}
              multiviewExpectedCount={Number.parseInt(studio.multiviewForm.count, 10) || 1}
              refineAspectRatio={studio.refineForm.aspectRatio}
              multiviewAspectRatio={studio.multiviewForm.aspectRatio}
              selectedRefineIndex={studio.selectedRefineIndex}
              onSelectRefine={studio.handleSelectRefine}
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
