import { Form, Select } from 'antd';
import {
  IMAGE_ASPECT_RATIO_OPTIONS,
  patchModel,
  toClarityOptions,
  toCountOptions,
  toModelOptions,
} from '@/app/studio/_utils/model-options';
import styles from './GenerateSpecFields.module.css';

type GenerateSpecFieldsProps = {
  /** Form 字段前缀，如 `['spec']` / `['designSpec']` / `['refineSpec']`。 */
  namePrefix: (string | number)[];
  showCount?: boolean;
  aspectRatioLabel?: string;
};

/**
 * 出图规格：模型、比例、清晰度、数量各自独立 Form.Item。
 * 切换模型时用 `patchModel` 回写同前缀对象，保证清晰度 / 质量仍合法。
 */
export default function GenerateSpecFields({
  namePrefix,
  showCount = true,
  aspectRatioLabel = '比例',
}: GenerateSpecFieldsProps) {
  const form = Form.useFormInstance();
  const model = Form.useWatch([...namePrefix, 'model'], form) as string | undefined;

  function onModelChange(nextModel: string) {
    const current = (form.getFieldValue(namePrefix) ?? {}) as Record<string, unknown>;
    const patched = patchModel(
      {
        model: String(current.model ?? ''),
        clarity: String(current.clarity ?? ''),
        quality: String(current.quality ?? ''),
      },
      nextModel,
    );
    // 保留 designSpec 上的 textlessVisual / taskType 等额外键
    form.setFieldValue(namePrefix, { ...current, ...patched });
  }

  return (
    <>
      <div className={styles.pair}>
        <Form.Item name={[...namePrefix, 'model']} label="模型" className={styles.item}>
          <Select options={toModelOptions()} onChange={onModelChange} />
        </Form.Item>
        <Form.Item
          name={[...namePrefix, 'aspectRatio']}
          label={aspectRatioLabel}
          className={styles.item}
        >
          <Select options={IMAGE_ASPECT_RATIO_OPTIONS} />
        </Form.Item>
      </div>
      <Form.Item name={[...namePrefix, 'clarity']} label="清晰度" className={styles.item}>
        <Select options={toClarityOptions(model ?? '')} />
      </Form.Item>
      {showCount ? (
        <Form.Item name={[...namePrefix, 'count']} label="生成数量" className={styles.item}>
          <Select options={toCountOptions()} />
        </Form.Item>
      ) : null}
    </>
  );
}
