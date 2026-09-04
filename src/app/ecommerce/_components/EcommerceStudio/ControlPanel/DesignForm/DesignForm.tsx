import { Select } from 'antd';
import type { EcommerceTaskType } from '@/app/api/ecommerce/_shared/task-types';
import ProductUpload from '@/business-components/ProductUpload';
import {
  ASPECT_RATIO_OPTIONS,
  BOOLEAN_OPTIONS,
  DESIGN_TYPE_OPTIONS,
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
 * 视觉设计 / 营销海报表单：海报步提供可选模特形象，并隐藏物料类型与主视觉开关。
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
        <ProductUpload
          images={modelImages}
          max={MAX_MODEL_IMAGES}
          label="模特形象"
          subtitle={MODEL_IMAGE_SUBTITLE}
          hint={MODEL_IMAGE_HINT}
          ariaLabel="上传模特形象"
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
        {poster ? (
          <label className={styles.field}>
            <span className={styles.label}>尺寸比例</span>
            <Select
              value={form.aspectRatio}
              options={ASPECT_RATIO_OPTIONS}
              disabled={disabled}
              onChange={(value) => onFormChange(patchFormState(form, 'aspectRatio', value))}
            />
          </label>
        ) : (
          <label className={styles.field}>
            <span className={styles.label}>设计类型</span>
            <Select
              value={form.designType}
              options={DESIGN_TYPE_OPTIONS}
              disabled={disabled}
              onChange={(value) => onFormChange(patchFormState(form, 'designType', value))}
            />
          </label>
        )}
      </div>

      {poster ? null : (
        <>
          <label className={styles.field}>
            <span className={styles.label}>尺寸比例</span>
            <Select
              value={form.aspectRatio}
              options={ASPECT_RATIO_OPTIONS}
              disabled={disabled}
              onChange={(value) => onFormChange(patchFormState(form, 'aspectRatio', value))}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>参考主视觉</span>
            <Select
              value={form.referenceVisual}
              options={BOOLEAN_OPTIONS}
              disabled={disabled}
              onChange={(value) => onFormChange(patchFormState(form, 'referenceVisual', value))}
            />
          </label>
        </>
      )}

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
