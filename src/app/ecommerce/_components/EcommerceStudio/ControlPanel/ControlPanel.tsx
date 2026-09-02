import { HighlightOutlined } from '@ant-design/icons';
import { Badge, Button, Input, Segmented, Select } from 'antd';
import {
  ANALYZE_BUTTON,
  ASPECT_RATIO_OPTIONS,
  CLARITY_OPTIONS,
  COUNT_OPTIONS,
  DESIGN_TYPE_ITEMS,
  LANGUAGE_OPTIONS,
  MODEL_OPTIONS,
  PLATFORM_OPTIONS,
  QUALITY_OPTIONS,
  REQUIREMENT_LABELS,
  REQUIREMENT_PLACEHOLDER,
} from '../constants';
import type { ProductImageItem, StudioFormState, StudioPhase } from '../types';
import ProductUpload from './ProductUpload';
import { patchDesignType, patchFormState, toDesignType } from './utils';
import styles from './ControlPanel.module.css';

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

type ControlPanelProps = {
  images: ProductImageItem[];
  form: StudioFormState;
  phase: StudioPhase;
  formLocked: boolean;
  helpWriteLoading: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
  onAnalyze: () => void;
  onHelpWrite: () => void;
};

/**
 * 电商工作台左侧控制栏：上传、类型、生成参数；主按钮恒为分析产品。
 */
export default function ControlPanel({
  images,
  form,
  phase,
  formLocked,
  helpWriteLoading,
  onImagesAppend,
  onImageRemove,
  onFormChange,
  onAnalyze,
  onHelpWrite,
}: ControlPanelProps) {
  const analyzing = phase === 'analyzing';
  const analyzeDisabled = images.length === 0 || phase === 'generating';

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        <ProductUpload
          images={images}
          disabled={formLocked}
          onAppend={onImagesAppend}
          onRemove={onImageRemove}
        />

        <Segmented
          block
          disabled={formLocked}
          value={form.designType}
          options={TYPE_OPTIONS}
          onChange={(value) => onFormChange(patchDesignType(form, toDesignType(value)))}
        />

        <label className={styles.field}>
          <span className={styles.label}>目标平台</span>
          <Select
            value={form.platform}
            options={PLATFORM_OPTIONS}
            disabled={formLocked}
            onChange={(value) => onFormChange(patchFormState(form, 'platform', value))}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>{REQUIREMENT_LABELS[form.designType]}</span>
          <div className={styles.requirementWrap}>
            <Input.TextArea
              className={styles.requirement}
              value={form.requirement}
              placeholder={REQUIREMENT_PLACEHOLDER}
              disabled={formLocked}
              onChange={(event) =>
                onFormChange(patchFormState(form, 'requirement', event.target.value))
              }
            />
            <Button
              className={styles.helpWrite}
              size="small"
              icon={<HighlightOutlined />}
              loading={helpWriteLoading}
              disabled={formLocked}
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
            disabled={formLocked}
            onChange={(value) => onFormChange(patchFormState(form, 'language', value))}
          />
        </label>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>模型</span>
            <Select
              value={form.model}
              options={MODEL_OPTIONS}
              disabled={formLocked}
              onChange={(value) => onFormChange(patchFormState(form, 'model', value))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>尺寸比例</span>
            <Select
              value={form.aspectRatio}
              options={ASPECT_RATIO_OPTIONS}
              disabled={formLocked}
              onChange={(value) => onFormChange(patchFormState(form, 'aspectRatio', value))}
            />
          </label>
        </div>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>质量</span>
            <Select
              value={form.quality}
              options={QUALITY_OPTIONS}
              disabled={formLocked}
              onChange={(value) => onFormChange(patchFormState(form, 'quality', value))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>清晰度</span>
            <Select
              value={form.clarity}
              options={CLARITY_OPTIONS}
              disabled={formLocked}
              onChange={(value) => onFormChange(patchFormState(form, 'clarity', value))}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>生成数量</span>
          <Select
            value={form.count}
            options={COUNT_OPTIONS}
            disabled={formLocked}
            onChange={(value) => onFormChange(patchFormState(form, 'count', value))}
          />
        </label>
      </div>

      <div className={styles.footer}>
        <Button
          className={styles.analyzeBtn}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={analyzing}
          disabled={analyzeDisabled}
          onClick={onAnalyze}
        >
          {ANALYZE_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
