import { Select } from 'antd';
import { patchModel, toClarityOptions, toCountOptions } from '@/app/studio/_utils/model-options';
import styles from './GenerateSpecForm.module.css';

export type GenerateSpecFormFields = {
  model: string;
  aspectRatio: string;
  quality: string;
  clarity: string;
  count: string;
};

type SelectOption = { value: string; label: string };

type GenerateSpecFormProps<T extends GenerateSpecFormFields> = {
  form: T;
  disabled: boolean;
  onChange: (next: T) => void;
  modelOptions: SelectOption[];
  aspectRatioOptions: SelectOption[];
  showCount?: boolean;
  aspectRatioLabel?: string;
};

/** 渲染模型、比例、清晰度与生成数量规格。 */
export default function GenerateSpecForm<T extends GenerateSpecFormFields>({
  form,
  disabled,
  onChange,
  modelOptions,
  aspectRatioOptions,
  showCount = true,
  aspectRatioLabel = '比例',
}: GenerateSpecFormProps<T>) {
  return (
    <>
      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>模型</span>
          <Select
            value={form.model}
            options={modelOptions}
            disabled={disabled}
            onChange={(model) => onChange(patchModel(form, model))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{aspectRatioLabel}</span>
          <Select
            value={form.aspectRatio}
            options={aspectRatioOptions}
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
      {showCount ? (
        <label className={styles.field}>
          <span className={styles.label}>生成数量</span>
          <Select
            value={form.count}
            options={toCountOptions()}
            disabled={disabled}
            onChange={(count) => onChange({ ...form, count })}
          />
        </label>
      ) : null}
    </>
  );
}
