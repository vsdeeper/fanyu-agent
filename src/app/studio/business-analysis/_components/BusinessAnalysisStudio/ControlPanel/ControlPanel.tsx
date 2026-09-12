import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { ANALYZE_BUTTON, NO_MATERIAL_WARNING } from '../constants';
import type { ProductDocItem, ProductImageItem } from '../types';
import { hasAnalyzeMaterials } from '../utils';
import AnalyzeForm from './AnalyzeForm';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  images: ProductImageItem[];
  brandLogo: ProductImageItem[];
  productDescription: string;
  documents: ProductDocItem[];
  analyzing: boolean;
  formLocked: boolean;
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onBrandLogoAppend: (files: File[]) => void;
  onBrandLogoRemove: (uid: string) => void;
  onProductDescriptionChange: (value: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onAnalyze: () => void;
};

/** 商业分析工作台左侧栏：品牌 Logo、产品图、产品资料、产品说明与开始分析。 */
export default function ControlPanel({
  images,
  brandLogo,
  productDescription,
  documents,
  analyzing,
  formLocked,
  onImagesAppend,
  onImageRemove,
  onBrandLogoAppend,
  onBrandLogoRemove,
  onProductDescriptionChange,
  onDocsAppend,
  onDocRemove,
  onAnalyze,
}: ControlPanelProps) {
  // 四项素材全空时按钮不可点；提示必须就地渲染，disabled 按钮点不动 message.warning 那条路径
  const canAnalyze = hasAnalyzeMaterials({ images, brandLogo, productDescription, documents });

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        <AnalyzeForm
          images={images}
          brandLogo={brandLogo}
          productDescription={productDescription}
          documents={documents}
          disabled={formLocked}
          onImagesAppend={onImagesAppend}
          onImageRemove={onImageRemove}
          onBrandLogoAppend={onBrandLogoAppend}
          onBrandLogoRemove={onBrandLogoRemove}
          onProductDescriptionChange={onProductDescriptionChange}
          onDocsAppend={onDocsAppend}
          onDocRemove={onDocRemove}
        />
      </div>
      <div className={styles.footer}>
        {canAnalyze ? null : <span className={styles.footerHint}>{NO_MATERIAL_WARNING}</span>}
        <Button
          className={styles.analyzeBtn}
          type="primary"
          block
          size="large"
          icon={<HighlightOutlined />}
          loading={analyzing}
          disabled={!canAnalyze}
          onClick={onAnalyze}
        >
          {ANALYZE_BUTTON}
        </Button>
      </div>
    </aside>
  );
}
