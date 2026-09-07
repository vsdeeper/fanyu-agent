import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import AnalyzeForm from '@/app/studio/_components/AnalyzeForm';
import { ANALYZE_BUTTON } from '../constants';
import type { ProductDocItem, ProductImageItem } from '../types';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  documents: ProductDocItem[];
  analyzing: boolean;
  formLocked: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onAnalyze: () => void;
};

/** 商业分析工作台左侧栏：产品图、产品资料与开始分析。 */
export default function ControlPanel({
  images,
  documents,
  analyzing,
  formLocked,
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
  onAnalyze,
}: ControlPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        <AnalyzeForm
          images={images}
          documents={documents}
          disabled={formLocked}
          onImagesAppend={onImagesAppend}
          onImageRemove={onImageRemove}
          onDocsAppend={onDocsAppend}
          onDocRemove={onDocRemove}
        />
      </div>
      <div className={styles.footer}>
        <Button
          className={styles.analyzeBtn}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={analyzing}
          disabled={images.length === 0}
          onClick={onAnalyze}
        >
          {ANALYZE_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
