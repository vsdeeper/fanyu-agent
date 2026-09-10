import { HighlightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import AnalyzeForm from '@/app/studio/_components/AnalyzeForm';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  ANALYZE_BUTTON,
  DESIGN_BUTTON,
  DETAIL_IMAGE_BUTTON,
  MAIN_IMAGE_BUTTON,
  POSTER_BUTTON,
  VISUAL_BUTTON,
} from '../constants';
import type {
  DesignFormState,
  ProductDocItem,
  ProductImageItem,
  StudioFormState,
  StudioPhase,
  StudioSpecFields,
} from '../types';
import { isDetailImageTask, isMainImageTask, isPosterTask, isThemePlanTask } from '../workflow';
import DesignForm from './DesignForm';
import GenerateForm from './GenerateForm';
import ThemeDesignForm from './ThemeDesignForm';
import { isAnalyzePhase, isDesignPhase, isVisualPhase } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  taskType: EcommerceTaskType;
  images: ProductImageItem[];
  documents: ProductDocItem[];
  productDocs: ProductDocItem[];
  modelImages: ProductImageItem[];
  form: StudioFormState;
  designForm: DesignFormState;
  phase: StudioPhase;
  formLocked: boolean;
  canGenerateVisual: boolean;
  canGenerateDesign: boolean;
  selectedCards?: ThemePlanCard[];
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onProductDocsAppend: (files: File[]) => void;
  onProductDocRemove: (uid: string) => void;
  onModelImagesAppend: (files: File[]) => void;
  onModelImageRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
  onDesignFormChange: (next: DesignFormState) => void;
  onAnalyze: () => void;
  onGenerateVisual: () => void;
  onGenerateDesign: () => void;
};

/**
 * 电商工作台左侧栏：分析资料、主视觉规格、主题设计或视觉设计 / 营销海报表单。
 */
export default function ControlPanel({
  taskType,
  images,
  documents,
  productDocs,
  modelImages,
  form,
  designForm,
  phase,
  formLocked,
  canGenerateVisual,
  canGenerateDesign,
  selectedCards = [],
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
  onProductDocsAppend,
  onProductDocRemove,
  onModelImagesAppend,
  onModelImageRemove,
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
  const poster = isPosterTask(taskType);
  const themePlan = isThemePlanTask(taskType);
  const mainImage = isMainImageTask(taskType);
  const analyzeDisabled = themePlan ? documents.length === 0 : images.length === 0;

  const handleVisualSpecChange = (next: StudioSpecFields) => {
    onFormChange({ ...form, ...next });
  };

  const designButton = isDetailImageTask(taskType)
    ? DETAIL_IMAGE_BUTTON
    : mainImage
      ? MAIN_IMAGE_BUTTON
      : poster
        ? POSTER_BUTTON
        : DESIGN_BUTTON;

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {showAnalyzeForm && themePlan ? (
          <>
            <ProductDocsUpload
              documents={productDocs}
              disabled={formLocked}
              onAppend={onProductDocsAppend}
              onRemove={onProductDocRemove}
            />
            <ProductDocsUpload
              documents={documents}
              disabled={formLocked}
              max={1}
              label="商业分析"
              hint="上传商业分析 TXT / MD"
              ariaLabel="上传商业分析"
              onAppend={onDocsAppend}
              onRemove={onDocRemove}
            />
          </>
        ) : showAnalyzeForm ? (
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
          <>
            {poster ? (
              <>
                <StudioImageUpload
                  label="产品精修图"
                  images={images}
                  disabled={formLocked}
                  onAppend={onImagesAppend}
                  onRemove={onImageRemove}
                />
                <ProductDocsUpload
                  documents={documents}
                  disabled={formLocked}
                  max={1}
                  label="商业分析"
                  hint="上传商业分析 TXT / MD"
                  ariaLabel="上传商业分析"
                  onAppend={onDocsAppend}
                  onRemove={onDocRemove}
                />
              </>
            ) : null}
            <GenerateForm
              form={form}
              disabled={formLocked}
              onFormChange={handleVisualSpecChange}
              count={form.count}
              onCountChange={(value) => onFormChange({ ...form, count: value })}
            />
          </>
        ) : showDesignForm && themePlan ? (
          <ThemeDesignForm
            form={designForm}
            images={images}
            selectedCards={selectedCards}
            disabled={formLocked}
            onFormChange={onDesignFormChange}
            onImagesAppend={onImagesAppend}
            onImageRemove={onImageRemove}
          />
        ) : showDesignForm ? (
          <DesignForm
            form={designForm}
            taskType={taskType}
            modelImages={modelImages}
            disabled={formLocked}
            onFormChange={onDesignFormChange}
            onModelImagesAppend={onModelImagesAppend}
            onModelImageRemove={onModelImageRemove}
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
            disabled={!canGenerateVisual}
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
            disabled={!canGenerateDesign}
            onClick={onGenerateDesign}
          >
            {designButton}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
