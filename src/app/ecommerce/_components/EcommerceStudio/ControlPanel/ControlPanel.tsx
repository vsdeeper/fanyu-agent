import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { ANALYZE_BUTTON } from '../constants';
import type { ProductDocItem, ProductImageItem, StudioFormState, StudioPhase } from '../types';
import AnalyzeForm from './AnalyzeForm';
import GenerateForm from './GenerateForm';
import { isAnalyzePhase } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  form: StudioFormState;
  phase: StudioPhase;
  formLocked: boolean;
  helpWriteLoading: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
  onAnalyze: () => void;
  onHelpWrite: () => void;
};

/**
 * 电商工作台左侧栏：商业分析步骤为资料与产品图，确认规划起为出图参数。
 */
export default function ControlPanel({
  images,
  documents,
  form,
  phase,
  formLocked,
  helpWriteLoading,
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
  onFormChange,
  onAnalyze,
  onHelpWrite,
}: ControlPanelProps) {
  const analyzing = phase === 'analyzing';
  const showAnalyzeForm = isAnalyzePhase(phase);
  const analyzeDisabled = images.length === 0;

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
        ) : (
          <GenerateForm
            form={form}
            disabled={formLocked}
            helpWriteLoading={helpWriteLoading}
            onFormChange={onFormChange}
            onHelpWrite={onHelpWrite}
          />
        )}
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
    </aside>
  );
}
