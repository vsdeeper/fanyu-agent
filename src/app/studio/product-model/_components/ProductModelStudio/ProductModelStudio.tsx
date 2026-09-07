'use client';

import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Layout, Steps, Typography } from 'antd';
import { useRouter } from 'next/navigation';
import type { ProductModelTaskDetail } from '@/app/api/studio/product-model/_shared/task-types';
import { PRODUCT_MODEL_PATH } from '@/components/AppLayout/constants';
import ModeSwitch from '@/components/ModeSwitch';
import { STUDIO_STEP_INDEX, STUDIO_STEPS } from './constants';
import CompletionPanel from './CompletionPanel';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { useProductModelStudio } from './hooks/useProductModelStudio';
import styles from './ProductModelStudio.module.css';

type ProductModelStudioProps = {
  task: ProductModelTaskDetail;
};

/** 产品模特生成与物料预览工作台：产品模特 → 预览生成物料。 */
export default function ProductModelStudio({ task }: ProductModelStudioProps) {
  const router = useRouter();
  const studio = useProductModelStudio(task);
  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          shape="circle"
          aria-label="返回产品模特任务列表"
          onClick={() => router.push(PRODUCT_MODEL_PATH)}
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
          <CompletionPanel results={studio.results} onPrev={studio.handlePrev} />
        ) : (
          <>
            <ControlPanel
              productImages={studio.productImages}
              modelImages={studio.modelImages}
              form={studio.form}
              generating={studio.generating}
              onProductImagesAppend={studio.handleProductImagesAppend}
              onProductImageRemove={studio.handleProductImageRemove}
              onModelImagesAppend={studio.handleModelImagesAppend}
              onModelImageRemove={studio.handleModelImageRemove}
              onFormChange={studio.setForm}
              onGenerate={studio.handleGenerate}
            />
            <ResultPanel
              images={studio.results}
              expectedCount={Number.parseInt(studio.form.count, 10) || 1}
              aspectRatio={studio.form.aspectRatio}
              generating={studio.generating}
              persisting={studio.persisting}
              onComplete={studio.handleComplete}
            />
          </>
        )}
      </Layout.Content>
    </Layout>
  );
}
