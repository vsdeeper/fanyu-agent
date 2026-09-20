import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, type FormInstance } from 'antd';
import type { ThemePlanCard } from '@/app/api/studio/ecommerce/_shared/theme-plan';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import ProductDocsUpload from '@/business-components/ProductDocsUpload';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import {
  ANALYSIS_UPLOAD_MISSING,
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
  VISUAL_BUTTON,
  VISUAL_PRODUCT_IMAGE_SUBTITLE,
} from '../constants';
import type { EcommercePanelValues, StudioPhase } from '../types';
import { isDetailImageTask, isMainImageTask, isPosterTask, isThemePlanTask } from '../workflow';
import DesignForm from './DesignForm';
import GenerateForm from './GenerateForm';
import ThemeDesignForm from './ThemeDesignForm';
import { isAnalyzePhase, isDesignPhase, isVisualPhase } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  taskType: EcommerceTaskType;
  form: FormInstance<EcommercePanelValues>;
  initialValues: EcommercePanelValues;
  phase: StudioPhase;
  formLocked: boolean;
  /** 是否已有后台生图作业在跑；生成中允许点上一步，故它不能由相位推导 */
  jobRunning: boolean;
  canGenerateDesign: boolean;
  selectedCards?: ThemePlanCard[];
  /** 左栏字段变化；目前只有商业分析文档需要联动右栏正文 */
  onFieldChange: (changed: Partial<EcommercePanelValues>) => void;
  onAnalyze: () => void;
  onGenerateVisual: () => void;
  onGenerateDesign: () => void;
};

/**
 * 电商工作台左侧栏：主题规划分析资料、主视觉规格、主题设计或视觉设计 / 营销海报表单。
 */
export default function ControlPanel({
  taskType,
  form,
  initialValues,
  phase,
  formLocked,
  jobRunning,
  canGenerateDesign,
  selectedCards = [],
  onFieldChange,
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
        {/*
          三步共用一个 Form：切步骤只换注册的 Form.Item 集合（preserve 默认 true，值仍留在 store），
          几个上传项因此能在互斥分支里复用同一个 name。左栏值的唯一真相是这份 store，
          读值一律用 getFieldsValue(true)；不要加 clearOnDestroy，也不要改成 component={false}。
        */}
        <Form
          form={form}
          initialValues={initialValues}
          layout="vertical"
          disabled={formLocked}
          className={styles.form}
          onValuesChange={onFieldChange}
        >
          {showAnalyzeForm ? (
            <>
              {themePlan ? (
                <Form.Item name="brandLogo">
                  <StudioImageUpload
                    label={BRAND_LOGO_LABEL}
                    subtitle={BRAND_LOGO_SUBTITLE}
                    hint={BRAND_LOGO_HINT}
                    ariaLabel={BRAND_LOGO_ARIA_LABEL}
                    max={MAX_BRAND_LOGOS}
                    disabled={formLocked}
                  />
                </Form.Item>
              ) : null}
              <Form.Item name="productDocs">
                <ProductDocsUpload disabled={formLocked} />
              </Form.Item>
              <Form.Item
                name="documents"
                rules={[{ required: true, message: ANALYSIS_UPLOAD_MISSING }]}
              >
                <ProductDocsUpload
                  max={1}
                  label="商业分析"
                  hint="上传商业分析 TXT / MD"
                  ariaLabel="上传商业分析"
                  disabled={formLocked}
                  required
                />
              </Form.Item>
            </>
          ) : showVisualForm ? (
            <>
              {poster ? (
                <>
                  <Form.Item name="brandLogo">
                    <StudioImageUpload
                      label={BRAND_LOGO_LABEL}
                      subtitle={BRAND_LOGO_SUBTITLE}
                      hint={BRAND_LOGO_HINT}
                      ariaLabel={BRAND_LOGO_ARIA_LABEL}
                      max={MAX_BRAND_LOGOS}
                      disabled={formLocked}
                    />
                  </Form.Item>
                  <Form.Item name="images">
                    <StudioImageUpload
                      label="产品精修图"
                      subtitle={VISUAL_PRODUCT_IMAGE_SUBTITLE}
                      disabled={formLocked}
                    />
                  </Form.Item>
                  <Form.Item
                    name="documents"
                    rules={[{ required: true, message: ANALYSIS_UPLOAD_MISSING }]}
                  >
                    <ProductDocsUpload
                      max={1}
                      label="商业分析"
                      hint="上传商业分析 TXT / MD"
                      ariaLabel="上传商业分析"
                      disabled={formLocked}
                      required
                    />
                  </Form.Item>
                </>
              ) : null}
              <Form.Item name="visualSpec">
                <GenerateForm />
              </Form.Item>
            </>
          ) : showDesignForm && themePlan ? (
            <ThemeDesignForm selectedCards={selectedCards} disabled={formLocked} />
          ) : showDesignForm ? (
            <DesignForm taskType={taskType} disabled={formLocked} />
          ) : null}
        </Form>
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
            disabled={jobRunning}
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
            disabled={visualBlocked}
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
