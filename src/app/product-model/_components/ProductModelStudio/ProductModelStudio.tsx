'use client';

import { Layout, Typography } from 'antd';
import ModeSwitch from '@/components/ModeSwitch';
import { STUDIO_SUBTITLE, STUDIO_TITLE } from './constants';
import ControlPanel from './ControlPanel';
import ResultPanel from './ResultPanel';
import { useProductModelStudio } from './useProductModelStudio';
import styles from './ProductModelStudio.module.css';

/** 独立产品模特生成与导出工作台。 */
export default function ProductModelStudio() {
  const studio = useProductModelStudio();
  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <div className={styles.brand}>
          <Typography.Title level={5} className={styles.title} ellipsis>
            {STUDIO_TITLE}
          </Typography.Title>
          <Typography.Text className={styles.subtitle} ellipsis>
            {STUDIO_SUBTITLE}
          </Typography.Text>
        </div>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <Layout.Content className={styles.content}>
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
          exporting={studio.exporting}
          readyCount={studio.readyCount}
          onExport={studio.handleExport}
        />
      </Layout.Content>
    </Layout>
  );
}
