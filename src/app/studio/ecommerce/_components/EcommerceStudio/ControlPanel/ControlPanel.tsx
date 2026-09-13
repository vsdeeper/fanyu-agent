import { HighlightOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  ANALYZE_BUTTON,
  BRAND_LOGO_ARIA_LABEL,
  BRAND_LOGO_HINT,
  BRAND_LOGO_LABEL,
  BRAND_LOGO_SUBTITLE,
  DESIGN_BUTTON,
  DETAIL_IMAGE_BUTTON,
  MAIN_IMAGE_BUTTON,
  MAX_BRAND_LOGOS,
  POSTER_BUTTON,
  USER_REQUIREMENT_HINT,
  USER_REQUIREMENT_LABEL,
  USER_REQUIREMENT_PLACEHOLDER,
  VISUAL_BUTTON,
  VISUAL_PRODUCT_IMAGE_SUBTITLE,
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
  /** 品牌 Logo（至多一张）；主图 / 详情图任务在分析步录入，营销海报在主视觉步录入 */
  brandLogo: ProductImageItem[];
  /** 用户要求（营销海报主视觉步录入，主视觉与海报两步共用）；默认为空串 */
  userRequirement: string;
  onUserRequirementChange: (value: string) => void;
  modelImages: ProductImageItem[];
  form: StudioFormState;
  designForm: DesignFormState;
  phase: StudioPhase;
  formLocked: boolean;
  /** 是否已有后台生图作业在跑；生成中允许点上一步，故它不能由相位推导 */
  jobRunning: boolean;
  canGenerateVisual: boolean;
  canGenerateDesign: boolean;
  selectedCards?: ThemePlanCard[];
  onImagesAppend: (files: File[]) => void;
  onImageRemove: (uid: string) => void;
  onDocsAppend: (files: File[]) => void;
  onDocRemove: (uid: string) => void;
  onProductDocsAppend: (files: File[]) => void;
  onProductDocRemove: (uid: string) => void;
  onBrandLogoAppend: (files: File[]) => void;
  onBrandLogoRemove: (uid: string) => void;
  onModelImagesAppend: (files: File[]) => void;
  onModelImageRemove: (uid: string) => void;
  onFormChange: (next: StudioFormState) => void;
  onDesignFormChange: (next: DesignFormState) => void;
  onAnalyze: () => void;
  onGenerateVisual: () => void;
  onGenerateDesign: () => void;
};

/**
 * 电商工作台左侧栏：主题规划分析资料、主视觉规格、主题设计或视觉设计 / 营销海报表单。
 */
export default function ControlPanel({
  taskType,
  images,
  documents,
  productDocs,
  brandLogo,
  userRequirement,
  onUserRequirementChange,
  modelImages,
  form,
  designForm,
  phase,
  formLocked,
  jobRunning,
  canGenerateVisual,
  canGenerateDesign,
  selectedCards = [],
  onImagesAppend,
  onImageRemove,
  onDocsAppend,
  onDocRemove,
  onProductDocsAppend,
  onProductDocRemove,
  onBrandLogoAppend,
  onBrandLogoRemove,
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
  /**
   * 生成中允许点上一步，退回后相位不再是 *Generating，按钮会重新变可点。
   * 此时提交会命中服务端幂等（同任务同步骤已有 running 即原样返回），
   * 客户端却已按「新批次」加了占位槽，状态随之错乱 —— 故只要有作业在跑就禁用本步按钮。
   * 本步仍在生成时保留 loading 外观，不额外加 disabled。
   */
  const visualBlocked = jobRunning && !visualGenerating;
  const designBlocked = jobRunning && !designGenerating;
  const showAnalyzeForm = isAnalyzePhase(phase);
  const showVisualForm = isVisualPhase(phase);
  const showDesignForm = isDesignPhase(phase);
  const poster = isPosterTask(taskType);
  const themePlan = isThemePlanTask(taskType);
  const mainImage = isMainImageTask(taskType);
  const analyzeDisabled = documents.length === 0;

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
        {showAnalyzeForm ? (
          <>
            {themePlan ? (
              <StudioImageUpload
                label={BRAND_LOGO_LABEL}
                subtitle={BRAND_LOGO_SUBTITLE}
                hint={BRAND_LOGO_HINT}
                ariaLabel={BRAND_LOGO_ARIA_LABEL}
                images={brandLogo}
                max={MAX_BRAND_LOGOS}
                disabled={formLocked}
                onAppend={onBrandLogoAppend}
                onRemove={onBrandLogoRemove}
              />
            ) : null}
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
        ) : showVisualForm ? (
          <>
            {poster ? (
              <>
                <StudioImageUpload
                  label={BRAND_LOGO_LABEL}
                  subtitle={BRAND_LOGO_SUBTITLE}
                  hint={BRAND_LOGO_HINT}
                  ariaLabel={BRAND_LOGO_ARIA_LABEL}
                  images={brandLogo}
                  max={MAX_BRAND_LOGOS}
                  disabled={formLocked}
                  onAppend={onBrandLogoAppend}
                  onRemove={onBrandLogoRemove}
                />
                <StudioImageUpload
                  label="产品精修图"
                  subtitle={VISUAL_PRODUCT_IMAGE_SUBTITLE}
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
                <label className={styles.field}>
                  <span className={styles.label}>{USER_REQUIREMENT_LABEL}</span>
                  <Input.TextArea
                    value={userRequirement}
                    disabled={formLocked}
                    autoSize={{ minRows: 4, maxRows: 8 }}
                    placeholder={USER_REQUIREMENT_PLACEHOLDER}
                    aria-label={USER_REQUIREMENT_LABEL}
                    onChange={(event) => onUserRequirementChange(event.target.value)}
                  />
                  <span className={styles.hint}>{USER_REQUIREMENT_HINT}</span>
                </label>
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
            disabled={analyzeDisabled || jobRunning}
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
            disabled={!canGenerateVisual || visualBlocked}
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
            disabled={!canGenerateDesign || designBlocked}
            onClick={onGenerateDesign}
          >
            {designButton}
          </Button>
        </div>
      ) : null}
    </aside>
  );
}
