import { HighlightOutlined } from '@ant-design/icons';
import { Badge, Button, Input, Segmented, Select } from 'antd';
import {
  ASPECT_RATIO_OPTIONS,
  DESIGN_TYPE_ITEMS,
  LANGUAGE_OPTIONS,
  MODEL_OPTIONS,
  PLATFORM_OPTIONS,
  REQUIREMENT_LABELS,
  REQUIREMENT_PLACEHOLDER,
} from '../../constants';
import {
  isQualitySupported,
  toClarityOptions,
  toCountOptions,
  toQualityOptions,
} from '../../model-options';
import type { StudioFormState } from '../../types';
import { patchDesignType, patchFormState, patchModel, patchPlatform, toDesignType } from '../utils';
import styles from './GenerateForm.module.css';

const TYPE_OPTIONS = DESIGN_TYPE_ITEMS.map((item) => ({
  value: item.value,
  label: item.isNew ? (
    <span className={styles.typeLabel}>
      {item.label}
      <Badge className={styles.newBadge} count="NEW" color="#ff4d4f" />
    </span>
  ) : (
    item.label
  ),
}));

type GenerateFormProps = {
  form: StudioFormState;
  disabled: boolean;
  helpWriteLoading: boolean;
  onFormChange: (next: StudioFormState) => void;
  onHelpWrite: () => void;
};

/**
 * 确认规划及之后的出图参数：类型、平台、要求、模型与规格。
 */
export default function GenerateForm({
  form,
  disabled,
  helpWriteLoading,
  onFormChange,
  onHelpWrite,
}: GenerateFormProps) {
  return (
    <>
      <Segmented
        block
        disabled={disabled}
        value={form.designType}
        options={TYPE_OPTIONS}
        onChange={(value) => onFormChange(patchDesignType(form, toDesignType(value)))}
      />

      <label className={styles.field}>
        <span className={styles.label}>目标平台</span>
        <Select
          value={form.platform}
          options={PLATFORM_OPTIONS}
          disabled={disabled}
          onChange={(value) => onFormChange(patchPlatform(form, value))}
        />
      </label>

      <label className={styles.field}>
        <span className={styles.label}>{REQUIREMENT_LABELS[form.designType]}</span>
        <div className={styles.requirementWrap}>
          <Input.TextArea
            className={styles.requirement}
            value={form.requirement}
            placeholder={REQUIREMENT_PLACEHOLDER}
            autoSize={{ minRows: 3, maxRows: 10 }}
            disabled={disabled}
            onChange={(event) =>
              onFormChange(patchFormState(form, 'requirement', event.target.value))
            }
          />
          <Button
            className={styles.helpWrite}
            size="small"
            icon={<HighlightOutlined />}
            loading={helpWriteLoading}
            disabled={disabled}
            onClick={onHelpWrite}
          >
            AI 帮写
          </Button>
        </div>
      </label>

      <label className={styles.field}>
        <span className={styles.label}>目标语言</span>
        <Select
          value={form.language}
          options={LANGUAGE_OPTIONS}
          disabled={disabled}
          onChange={(value) => onFormChange(patchFormState(form, 'language', value))}
        />
      </label>

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

      <div className={styles.pair}>
        {isQualitySupported(form.model) && (
          <label className={styles.field}>
            <span className={styles.label}>质量</span>
            <Select
              value={form.quality}
              options={toQualityOptions(form.model)}
              disabled={disabled}
              onChange={(value) => onFormChange(patchFormState(form, 'quality', value))}
            />
          </label>
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
      </div>

      <label className={styles.field}>
        <span className={styles.label}>生成数量</span>
        <Select
          value={form.count}
          options={toCountOptions(form.designType, form.platform)}
          disabled={disabled}
          onChange={(value) => onFormChange(patchFormState(form, 'count', value))}
        />
      </label>
    </>
  );
}
