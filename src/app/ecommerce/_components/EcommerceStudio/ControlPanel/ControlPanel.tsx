import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { ANALYZE_BUTTON, DESIGN_BUTTON, VISUAL_BUTTON } from '../constants';
import type {
  DesignFormState,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioSpecFields,
} from '../types';
import AnalyzeForm from './AnalyzeForm';
import DesignForm from './DesignForm';
import GenerateForm from './GenerateForm';
import { isAnalyzePhase, isDesignPhase, isVisualPhase } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  form: StudioFormState;
  designForm: DesignFormState;
  phase: StudioPhase;
  formLocked: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
  onDesignFormChange: (next: DesignFormState) => void;
  onAnalyze: () => void;
  onGenerateVisual: () => void;
  onGenerateDesign: () => void;
};

/**
 * 电商工作台左侧栏：分析资料、主视觉规格或视觉设计表单。
 */
export default function ControlPanel({
  images,
  documents,
  form,
  designForm,
  phase,
  formLocked,
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
  onFormChange,
  onDesignFormChange,
  onAnalyze,
  onGenerateVisual,
  onGenerateDesign,
}: ControlPanelProps) {
  const analyzing = phase === 'analyzing';
  const visualGenerating = phase === 'visualGenerating';
  const designGenerating = phase === 'designGenerating';
  const showAnalyzeForm = isAnalyzePhase(phase);
  const showVisualForm = isVisualPhase(phase);
  const showDesignForm = isDesignPhase(phase);
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
