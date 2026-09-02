import { HighlightOutlined } from '@ant-design/icons';
import { Badge, Button, Input, Segmented, Select } from 'antd';
import {
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
import type { ProductImageItem, StudioFormState } from '../types';
import { notifyComingSoon } from '../utils';
import ProductUpload from './ProductUpload';
import { patchFormState, toDesignType } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  form: StudioFormState;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
};

/**
 * 电商工作台左侧控制栏：上传、类型、生成参数与分析入口。
 */
export default function ControlPanel({
  images,
  form,
  onImagesAppend,
  onImageRemove,
  onFormChange,
}: ControlPanelProps) {
  const typeOptions = DESIGN_TYPE_ITEMS.map((item) => ({
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

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        <ProductUpload images={images} onAppend={onImagesAppend} onRemove={onImageRemove} />

        <Segmented
          block
          value={form.designType}
          options={typeOptions}
          onChange={(value) =>
            onFormChange(patchFormState(form, 'designType', toDesignType(value)))
          }
        />

        <label className={styles.field}>
          <span className={styles.label}>目标平台</span>
          <Select
            value={form.platform}
            options={PLATFORM_OPTIONS}
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
              onChange={(event) =>
                onFormChange(patchFormState(form, 'requirement', event.target.value))
              }
            />
            <Button
              className={styles.helpWrite}
              size="small"
              icon={<HighlightOutlined />}
              onClick={notifyComingSoon}
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
            onChange={(value) => onFormChange(patchFormState(form, 'language', value))}
          />
        </label>

        <div className={styles.pair}>
          <label className={styles.field}>
            <span className={styles.label}>模型</span>
            <Select
              value={form.model}
              options={MODEL_OPTIONS}
              onChange={(value) => onFormChange(patchFormState(form, 'model', value))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>尺寸比例</span>
            <Select
              value={form.aspectRatio}
              options={ASPECT_RATIO_OPTIONS}
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
              onChange={(value) => onFormChange(patchFormState(form, 'quality', value))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>清晰度</span>
            <Select
              value={form.clarity}
              options={CLARITY_OPTIONS}
              onChange={(value) => onFormChange(patchFormState(form, 'clarity', value))}
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>生成数量</span>
          <Select
            value={form.count}
            options={COUNT_OPTIONS}
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
          onClick={notifyComingSoon}
        >
          分析产品
        </Button>
      </div>
    </aside>
  );
}
