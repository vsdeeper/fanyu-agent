import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import {
  ANALYZE_BUTTON,
  DESIGN_BUTTON,
  MODEL_BUTTON,
  PRODUCT_VIEW_BUTTON,
  VISUAL_BUTTON,
} from '../constants';
import type {
  DesignFormState,
  ModelFormState,
  ProductViewFormState,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioSpecFields,
} from '../types';
import AnalyzeForm from './AnalyzeForm';
import DesignForm from './DesignForm';
import GenerateForm from './GenerateForm';
import ModelForm from './ModelForm';
import {
  isAnalyzePhase,
  isDesignPhase,
  isModelPhase,
  isProductViewPhase,
  isVisualPhase,
} from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  portraits: ProductImageItem[];
  form: StudioFormState;
  productViewForm: ProductViewFormState;
  modelForm: ModelFormState;
  designForm: DesignFormState;
  phase: StudioPhase;
  formLocked: boolean;
  modelHelpWriteLoading: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onPortraitsAppend: (files: File[]) => void;
  onPortraitRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
  onProductViewFormChange: (next: ProductViewFormState) => void;
  onModelFormChange: (next: ModelFormState) => void;
  onDesignFormChange: (next: DesignFormState) => void;
  onAnalyze: () => void;
  onGenerateProductView: () => void;
  onGenerateVisual: () => void;
  onGenerateModel: () => void;
  onGenerateDesign: () => void;
  onModelHelpWrite: () => void;
};

/**
 * 电商工作台左侧栏：分析资料、主视觉规格或模特表单。
 */
export default function ControlPanel({
  images,
  documents,
  portraits,
  form,
  productViewForm,
  modelForm,
  designForm,
  phase,
  formLocked,
  modelHelpWriteLoading,
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
  onPortraitsAppend,
  onPortraitRemove,
  onFormChange,
  onProductViewFormChange,
  onModelFormChange,
  onDesignFormChange,
  onAnalyze,
  onGenerateProductView,
  onGenerateVisual,
  onGenerateModel,
  onGenerateDesign,
  onModelHelpWrite,
}: ControlPanelProps) {
  const analyzing = phase === 'analyzing';
  const productViewGenerating = phase === 'productViewGenerating';
  const visualGenerating = phase === 'visualGenerating';
  const modelGenerating = phase === 'modelGenerating';
  const designGenerating = phase === 'designGenerating';
  const showAnalyzeForm = isAnalyzePhase(phase);
  const showProductViewForm = isProductViewPhase(phase);
  const showVisualForm = isVisualPhase(phase);
  const showModelForm = isModelPhase(phase);
  const showDesignForm = isDesignPhase(phase);
  const analyzeDisabled = images.length === 0;

  const handleVisualSpecChange = (next: StudioSpecFields) => {
    onFormChange({ ...form, ...next });
  };
  const handleProductViewSpecChange = (next: StudioSpecFields) => {
    onProductViewFormChange({ ...productViewForm, ...next });
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {showAnalyzeForm ? (
          <AnalyzeForm
            images={images}
            documents={documents}
            disabled={formLocked}
            onImagesAppend={onImagesAppend}
            onImageRemove={onImageRemove}
            onDocsAppend={onDocsAppend}
            onDocRemove={onDocRemove}
          />
        ) : showProductViewForm ? (
          <GenerateForm
            form={productViewForm}
            disabled={formLocked}
            onFormChange={handleProductViewSpecChange}
            count={productViewForm.count}
            onCountChange={(value) => onProductViewFormChange({ ...productViewForm, count: value })}
          />
        ) : showVisualForm ? (
          <GenerateForm
            form={form}
            disabled={formLocked}
            onFormChange={handleVisualSpecChange}
            count={form.count}
            onCountChange={(value) => onFormChange({ ...form, count: value })}
          />
        ) : showModelForm ? (
          <ModelForm
            portraits={portraits}
            form={modelForm}
            disabled={formLocked}
            helpWriteLoading={modelHelpWriteLoading}
            onPortraitsAppend={onPortraitsAppend}
            onPortraitRemove={onPortraitRemove}
            onFormChange={onModelFormChange}
            onHelpWrite={onModelHelpWrite}
          />
        ) : showDesignForm ? (
          <DesignForm form={designForm} disabled={formLocked} onFormChange={onDesignFormChange} />
        ) : null}
      </div>
      {showAnalyzeForm ? (
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
      ) : null}
      {showVisualForm ? (
        <div className={styles.footer}>
          <Button
            className={styles.analyzeBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={visualGenerating}
            onClick={onGenerateVisual}
          >
            {VISUAL_BUTTON}
          </Button>
        </div>
      ) : null}
      {showProductViewForm ? (
        <div className={styles.footer}>
          <Button
            className={styles.analyzeBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={productViewGenerating}
            onClick={onGenerateProductView}
          >
            {PRODUCT_VIEW_BUTTON}
          </Button>
        </div>
      ) : null}
      {showModelForm ? (
        <div className={styles.footer}>
          <Button
            className={styles.analyzeBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={modelGenerating}
            onClick={onGenerateModel}
          >
            {MODEL_BUTTON}
          </Button>
        </div>
      ) : null}
      {showDesignForm ? (
        <div className={styles.footer}>
          <Button
            className={styles.analyzeBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={designGenerating}
            onClick={onGenerateDesign}
          >
            {DESIGN_BUTTON}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
