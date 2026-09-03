import { Select } from 'antd';
import { ASPECT_RATIO_OPTIONS, MODEL_OPTIONS } from '../../constants';
import { toClarityOptions, toCountOptions } from '../../model-options';
import type { StudioSpecFields } from '../../types';
import { patchFormState, patchModel } from '../utils';
import styles from './GenerateForm.module.css';

type GenerateFormProps = {
  form: StudioSpecFields;
  disabled: boolean;
  onFormChange: (next: StudioSpecFields) => void;
  count?: string;
  onCountChange?: (value: string) => void;
};

/**
 * 出图规格：模型、尺寸比例、清晰度；传入 count 时另显生成数量。
 */
export default function GenerateForm({
  form,
  disabled,
  onFormChange,
  count,
  onCountChange,
}: GenerateFormProps) {
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
          <span className={styles.label}>尺寸比例</span>
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

      {count !== undefined && onCountChange ? (
        <label className={styles.field}>
          <span className={styles.label}>生成数量</span>
          <Select
            value={count}
            options={toCountOptions()}
            disabled={disabled}
            onChange={onCountChange}
          />
        </label>
      ) : null}
    </>
  );
}
