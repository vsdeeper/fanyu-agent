'use client';

import { useEffect, useRef, useState } from 'react';
import { Layout, Steps, Typography } from 'antd';
import ModeSwitch from '@/components/ModeSwitch';
import ControlPanel from './ControlPanel';
import { DEFAULT_FORM_STATE, STUDIO_STEPS, STUDIO_TITLE } from './constants';
import ResultPanel from './ResultPanel';
import type { ProductImageItem, StudioFormState } from './types';
import { appendProductImages, removeProductImage, revokeProductImageUrls } from './utils';
import styles from './EcommerceStudio.module.css';

/**
 * 电商设计工作台：上传与参数在左，生成结果在右。本轮仅本地 UI。
 */
export default function EcommerceStudio() {
  const [images, setImages] = useState<ProductImageItem[]>([]);
  const [form, setForm] = useState<StudioFormState>(DEFAULT_FORM_STATE);
  const imagesRef = useRef(images);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => revokeProductImageUrls(imagesRef.current);
  }, []);

  return (
    <Layout className={styles.studio}>
      <Layout.Header className={styles.header}>
        <Typography.Title level={5} className={styles.title} ellipsis>
          {STUDIO_TITLE}
        </Typography.Title>
        <div className={styles.headerSpacer} />
        <ModeSwitch />
      </Layout.Header>
      <div className={styles.stepsRow}>
        <Steps className={styles.steps} current={0} size="small" items={[...STUDIO_STEPS]} />
      </div>
      <Layout.Content className={styles.content}>
        <ControlPanel
          images={images}
          form={form}
          onImagesAppend={(files) => setImages((current) => appendProductImages(current, files))}
          onImageRemove={(uid) => setImages((current) => removeProductImage(current, uid))}
          onFormChange={setForm}
        />
        <ResultPanel />
      </Layout.Content>
    </Layout>
  );
}
