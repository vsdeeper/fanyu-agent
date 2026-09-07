import { Select } from 'antd';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  ASPECT_RATIO_OPTIONS,
  MAX_MODEL_IMAGES,
  MODEL_IMAGE_HINT,
  MODEL_IMAGE_SUBTITLE,
  MODEL_OPTIONS,
} from '../../constants';
import { toClarityOptions, toCountOptions } from '../../model-options';
import type { DesignFormState, ProductImageItem } from '../../types';
import { isPosterTask } from '../../workflow';
import { patchFormState, patchModel } from '../utils';
import styles from './DesignForm.module.css';

type DesignFormProps = {
  form: DesignFormState;
  taskType: EcommerceTaskType;
  modelImages: ProductImageItem[];
  disabled: boolean;
  onFormChange: (next: DesignFormState) => void;
  onModelImagesAppend: (files: File[]) => void;
  onModelImageRemove: (uid: string) => void;
};

/**
 * 视觉设计 / 营销海报表单：海报步提供可选模特形象。
 */
export default function DesignForm({
  form,
  taskType,
  modelImages,
  disabled,
  onFormChange,
  onModelImagesAppend,
  onModelImageRemove,
}: DesignFormProps) {
  const poster = isPosterTask(taskType);

  return (
    <>
      {poster ? (
        <StudioImageUpload
          images={modelImages}
          max={MAX_MODEL_IMAGES}
          label="产品模特"
          subtitle={MODEL_IMAGE_SUBTITLE}
          hint={MODEL_IMAGE_HINT}
          ariaLabel="上传产品模特"
          disabled={disabled}
          onAppend={onModelImagesAppend}
          onRemove={onModelImageRemove}
        />
      ) : null}

      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>模型</span>
          <Select
            value={form.model}
            options={MODEL_OPTIONS}
            disabled={disabled}
            onChange={(value) => onFormChange(patchModel(form, value))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{poster ? '比例' : '尺寸比例'}</span>
          <Select
            value={form.aspectRatio}
            options={ASPECT_RATIO_OPTIONS}
            disabled={disabled}
            onChange={(value) => onFormChange(patchFormState(form, 'aspectRatio', value))}
          />
        </label>
      </div>

      <label className={styles.field}>
        <span className={styles.label}>清晰度</span>
        <Select
          value={form.clarity}
          options={toClarityOptions(form.model)}
          disabled={disabled}
          onChange={(value) => onFormChange(patchFormState(form, 'clarity', value))}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>生成数量</span>
        <Select
          value={form.count}
          options={toCountOptions()}
          disabled={disabled}
          onChange={(value) => onFormChange(patchFormState(form, 'count', value))}
        />
      </label>
    </>
  );
}
