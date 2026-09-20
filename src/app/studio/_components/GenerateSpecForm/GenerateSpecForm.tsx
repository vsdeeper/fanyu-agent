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

export type GenerateSpecSelectOption = { value: string; label: string };

export type GenerateSpecFormProps<T extends GenerateSpecFormFields> = {
  /** 受控值；未传按空规格处理（Form.Item 首帧可能注入 undefined） */
  value?: T;
  onChange?: (next: T) => void;
  modelOptions: GenerateSpecSelectOption[];
  aspectRatioOptions: GenerateSpecSelectOption[];
  showCount?: boolean;
  aspectRatioLabel?: string;
};

const EMPTY_SPEC_FIELDS: GenerateSpecFormFields = {
  model: '',
  aspectRatio: '',
  quality: '',
  clarity: '',
  count: '',
};

/**
 * 渲染模型、比例、清晰度与生成数量规格。
 *
 * 四项始终作为一个整对象受控：切换模型要连带改写清晰度的可选项（`patchModel`），
 * 拆成四个独立字段会把这份联动切碎，而它们本身都没有单字段校验。
 */
export default function GenerateSpecForm<T extends GenerateSpecFormFields>({
  value,
  onChange,
  modelOptions,
  aspectRatioOptions,
  showCount = true,
  aspectRatioLabel = '比例',
}: GenerateSpecFormProps<T>) {
  const form = value ?? (EMPTY_SPEC_FIELDS as T);
  const change = (next: T) => onChange?.(next);
  return (
    <>
      <div className={styles.pair}>
        <label className={styles.field}>
          <span className={styles.label}>模型</span>
          <Select
            value={form.model}
            options={modelOptions}
            onChange={(model) => change(patchModel(form, model))}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{aspectRatioLabel}</span>
          <Select
            value={form.aspectRatio}
            options={aspectRatioOptions}
            onChange={(aspectRatio) => change({ ...form, aspectRatio })}
          />
        </label>
      </div>
      <label className={styles.field}>
        <span className={styles.label}>清晰度</span>
        <Select
          value={form.clarity}
          options={toClarityOptions(form.model)}
          onChange={(clarity) => change({ ...form, clarity })}
        />
      </label>
      {showCount ? (
        <label className={styles.field}>
          <span className={styles.label}>生成数量</span>
          <Select
            value={form.count}
            options={toCountOptions()}
            onChange={(count) => change({ ...form, count })}
          />
        </label>
      ) : null}
    </>
  );
}
