import { HighlightOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  GENERATE_BUTTON,
  MAX_MODEL_IMAGES,
  MODEL_IMAGE_SUBTITLE,
  PRODUCT_IMAGE_SUBTITLE,
} from '../constants';
import type { ProductImageItem, ProductModelFormState } from '../types';
import GenerateSpecForm from '../GenerateSpecForm';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  productImages: ProductImageItem[];
  modelImages: ProductImageItem[];
  form: ProductModelFormState;
  generating: boolean;
  onProductImagesAppend: (files: File[]) => void;
  onProductImageRemove: (uid: string) => void;
  onModelImagesAppend: (files: File[]) => void;
  onModelImageRemove: (uid: string) => void;
  onFormChange: (next: ProductModelFormState) => void;
  onGenerate: () => void;
};

/** 产品模特工作台左栏：产品与模特参考图、视角要求和出图规格。 */
export default function ControlPanel({
  productImages,
  modelImages,
  form,
  generating,
  onProductImagesAppend,
  onProductImageRemove,
  onModelImagesAppend,
  onModelImageRemove,
  onFormChange,
  onGenerate,
}: ControlPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        <StudioImageUpload
          images={productImages}
          disabled={generating}
          subtitle={PRODUCT_IMAGE_SUBTITLE}
          onAppend={onProductImagesAppend}
          onRemove={onProductImageRemove}
        />
        <StudioImageUpload
          images={modelImages}
          max={MAX_MODEL_IMAGES}
          label="模特形象"
          subtitle={MODEL_IMAGE_SUBTITLE}
          hint="上传模特身份参考图（可选）"
          ariaLabel="上传模特形象"
          disabled={generating}
          onAppend={onModelImagesAppend}
          onRemove={onModelImageRemove}
        />
        <label className={styles.field}>
          <span className={styles.label}>视角要求</span>
          <Input.TextArea
            value={form.viewRequirement}
            disabled={generating}
            autoSize={{ minRows: 5, maxRows: 10 }}
            onChange={(event) => onFormChange({ ...form, viewRequirement: event.target.value })}
          />
        </label>
        <GenerateSpecForm form={form} disabled={generating} onChange={onFormChange} />
      </div>
      <div className={styles.footer}>
        <Button
          className={styles.primary}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={generating}
          disabled={productImages.length === 0}
          onClick={onGenerate}
        >
          {GENERATE_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
