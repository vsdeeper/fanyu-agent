import { Select } from 'antd';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../constants';
import { toClarityOptions, toCountOptions } from '../model-options';
import type { ProductModelFormState } from '../types';
import { patchModel } from '../utils';
import styles from './GenerateSpecForm.module.css';

type GenerateSpecFormProps = {
  form: ProductModelFormState;
  disabled: boolean;
  onChange: (next: ProductModelFormState) => void;
};

/** 渲染产品模特的模型、比例、清晰度与生成数量规格。 */
export default function GenerateSpecForm({ form, disabled, onChange }: GenerateSpecFormProps) {
  return (
    <>
      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>模型</span>
          <Select
            value={form.model}
            options={MODEL_OPTIONS}
            disabled={disabled}
            onChange={(model) => onChange(patchModel(form, model))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>比例</span>
          <Select
            value={form.aspectRatio}
            options={ASPECT_RATIO_OPTIONS}
            disabled={disabled}
            onChange={(aspectRatio) => onChange({ ...form, aspectRatio })}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>清晰度</span>
        <Select
          value={form.clarity}
          options={toClarityOptions(form.model)}
          disabled={disabled}
          onChange={(clarity) => onChange({ ...form, clarity })}
        />
      </label>
      <label className={styles.field}>
        <span className={styles.label}>生成数量</span>
        <Select
          value={form.count}
          options={toCountOptions()}
          disabled={disabled}
          onChange={(count) => onChange({ ...form, count })}
        />
      </label>
    </>
  );
}
