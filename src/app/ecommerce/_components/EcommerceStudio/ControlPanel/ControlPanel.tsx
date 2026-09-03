import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { ANALYZE_BUTTON, MODEL_BUTTON, VISUAL_BUTTON } from '../constants';
import type {
  ModelFormState,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioSpecFields,
} from '../types';
import AnalyzeForm from './AnalyzeForm';
import GenerateForm from './GenerateForm';
import ModelForm from './ModelForm';
import { isAnalyzePhase, isModelPhase, isVisualPhase } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  portraits: ProductImageItem[];
  form: StudioFormState;
  modelForm: ModelFormState;
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
  onModelFormChange: (next: ModelFormState) => void;
  onAnalyze: () => void;
  onGenerateVisual: () => void;
  onGenerateModel: () => void;
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
  modelForm,
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
  onModelFormChange,
  onAnalyze,
  onGenerateVisual,
  onGenerateModel,
  onModelHelpWrite,
}: ControlPanelProps) {
  const analyzing = phase === 'analyzing';
  const visualGenerating = phase === 'visualGenerating';
  const modelGenerating = phase === 'modelGenerating';
  const showAnalyzeForm = isAnalyzePhase(phase);
  const showVisualForm = isVisualPhase(phase);
  const showModelForm = isModelPhase(phase);
  const analyzeDisabled = images.length === 0;

  const handleVisualSpecChange = (next: StudioSpecFields) => {
    onFormChange({ ...form, ...next });
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
    </aside>
  );
}
