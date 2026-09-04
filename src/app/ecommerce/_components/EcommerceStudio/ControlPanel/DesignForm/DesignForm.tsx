import { Select } from 'antd';
import {
  ASPECT_RATIO_OPTIONS,
  BOOLEAN_OPTIONS,
  DESIGN_TYPE_OPTIONS,
  MODEL_OPTIONS,
} from '../../constants';
import { toClarityOptions, toCountOptions } from '../../model-options';
import type { DesignFormState } from '../../types';
import { patchFormState, patchModel } from '../utils';
import styles from './DesignForm.module.css';

type DesignFormProps = {
  form: DesignFormState;
  disabled: boolean;
  onFormChange: (next: DesignFormState) => void;
};

/**
 * 视觉设计表单：配置物料类型、主视觉参考与生成规格。
 */
export default function DesignForm({ form, disabled, onFormChange }: DesignFormProps) {
  return (
    <>
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
          <span className={styles.label}>设计类型</span>
          <Select
            value={form.designType}
            options={DESIGN_TYPE_OPTIONS}
            disabled={disabled}
            onChange={(value) => onFormChange(patchFormState(form, 'designType', value))}
          />
        </label>
      </div>

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
