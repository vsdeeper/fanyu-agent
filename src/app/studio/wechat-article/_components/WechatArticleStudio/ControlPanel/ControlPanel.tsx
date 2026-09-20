import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Space } from 'antd';
import StyleDimensionPicker, {
  StyleClipboardActions,
  hasStyleSelection,
  type StyleDimensionSelections,
} from '@/business-components/StyleDimensionPicker';
import StudioImageUpload from '@/business-components/StudioImageUpload';
import type { StudioImageUploadItem } from '@/business-components/StudioImageUpload/types';
import AngleCardView from '../AngleCardView';
import {
  DRAFT_BUTTON,
  DRAFT_TITLE_EMPTY,
  DRAFT_TITLE_LABEL,
  LENGTH_LIMIT_LABEL,
  LENGTH_LIMIT_MAX,
  LENGTH_LIMIT_MIN,
  LENGTH_LIMIT_PLACEHOLDER,
  LENGTH_LIMIT_SUFFIX,
  PLAN_BUTTON,
  PLAN_IMAGES_BUTTON,
  RESEARCH_BUTTON,
  STYLE_LABEL,
  STYLE_REFERENCE_HINT,
  STYLE_REFERENCE_LABEL,
  STYLE_REFERENCE_SUBTITLE,
  WATERMARK_ARIA_LABEL,
  WATERMARK_HINT,
  WATERMARK_LABEL,
  WATERMARK_SUBTITLE,
} from '../constants';
import type { AngleCard, PlanStepSnapshot, StudioPhase } from '../types';
import { resolvePlanTitle } from '../utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  phase: StudioPhase;
  idea: string;
  viewpoint: string;
  styleSelections: StyleDimensionSelections;
  lengthLimit?: number;
  styleReferenceImages: StudioImageUploadItem[];
  watermarkImages: StudioImageUploadItem[];
  onIdeaChange: (value: string) => void;
  onViewpointChange: (value: string) => void;
  onStyleSelectionsChange: (value: StyleDimensionSelections) => void;
  onLengthLimitChange: (value: number | undefined) => void;
  onStyleReferenceAppend: (files: File[]) => void;
  onStyleReferenceRemove: (uid: string) => void;
  onWatermarkAppend: (files: File[]) => void;
  onWatermarkRemove: (uid: string) => void;
  onResearch: () => void;
  onPlan: () => void;
  onDraft: () => void;
  onPlanImages: () => void;
  selectedAngle?: AngleCard;
  plan?: PlanStepSnapshot;
  hasMarkdown: boolean;
};

/** 公众号左栏：按当前步骤展示想法 / 思路参数 / 成稿文风 / 配图水印与风格参考。 */
export default function ControlPanel({
  phase,
  idea,
  viewpoint,
  styleSelections,
  lengthLimit,
  styleReferenceImages,
  watermarkImages,
  onIdeaChange,
  onViewpointChange,
  onStyleSelectionsChange,
  onLengthLimitChange,
  onStyleReferenceAppend,
  onStyleReferenceRemove,
  onWatermarkAppend,
  onWatermarkRemove,
  onResearch,
  onPlan,
  onDraft,
  onPlanImages,
  selectedAngle,
  plan,
  hasMarkdown,
}: ControlPanelProps) {
  const busy =
    phase === 'researching' ||
    phase === 'planning' ||
    phase === 'drafting' ||
    phase === 'illustrating';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planStep = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const draftStep = phase === 'draft' || phase === 'drafting' || phase === 'drafted';
  const imagesStep = phase === 'images' || phase === 'illustrating' || phase === 'illustrated';
  const draftTitle = plan ? resolvePlanTitle(plan) : undefined;

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {researchStep ? (
          <Form layout="vertical" requiredMark disabled={busy} className={styles.form}>
            <Form.Item label="我的想法" required>
              <Input.TextArea
                rows={4}
                value={idea}
                placeholder="例如：AI agent 开始替人逛电商"
                onChange={(event) => onIdeaChange(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="我的观点">
              <Input.TextArea
                rows={4}
                value={viewpoint}
                placeholder="例如：国外已经在落地，国内还在聊概念"
                onChange={(event) => onViewpointChange(event.target.value)}
              />
            </Form.Item>
          </Form>
        ) : null}

        {planStep ? (
          <div className={styles.angleBlock}>
            <div className={styles.angleLabel}>选定角度</div>
            {selectedAngle ? (
              <AngleCardView angle={selectedAngle} />
            ) : (
              <p className={styles.angleEmpty}>尚未选择角度</p>
            )}
          </div>
        ) : null}

        {draftStep ? (
          <Form layout="vertical" requiredMark disabled={busy} className={styles.form}>
            <Form.Item label={DRAFT_TITLE_LABEL}>
              <Input value={draftTitle ?? ''} placeholder={DRAFT_TITLE_EMPTY} readOnly />
            </Form.Item>
            <Form.Item label={LENGTH_LIMIT_LABEL}>
              <Space.Compact className={styles.lengthLimit} block>
                <InputNumber
                  min={LENGTH_LIMIT_MIN}
                  max={LENGTH_LIMIT_MAX}
                  step={100}
                  value={lengthLimit}
                  placeholder={LENGTH_LIMIT_PLACEHOLDER}
                  onChange={(value) =>
                    onLengthLimitChange(typeof value === 'number' ? value : undefined)
                  }
                />
                <Space.Addon>{LENGTH_LIMIT_SUFFIX}</Space.Addon>
              </Space.Compact>
            </Form.Item>
            {/* 复制/粘贴浮在「文风」标签行右侧（见 module.css 的 styleActions）：
                不进 Form.Item 的 label，否则 `<button>` 会被 label 隐式关联。 */}
            <div className={styles.styleRow}>
              <Form.Item label={STYLE_LABEL} required>
                <StyleDimensionPicker
                  selections={styleSelections}
                  disabled={busy}
                  onChange={onStyleSelectionsChange}
                />
              </Form.Item>
              <StyleClipboardActions
                className={styles.styleActions}
                selections={styleSelections}
                disabled={busy}
                onPaste={onStyleSelectionsChange}
              />
            </div>
          </Form>
        ) : null}

        {imagesStep ? (
          <>
            <StudioImageUpload
              images={watermarkImages}
              max={1}
              label={WATERMARK_LABEL}
              subtitle={WATERMARK_SUBTITLE}
              hint={WATERMARK_HINT}
              ariaLabel={WATERMARK_ARIA_LABEL}
              disabled={busy}
              onAppend={onWatermarkAppend}
              onRemove={onWatermarkRemove}
            />
            <StudioImageUpload
              images={styleReferenceImages}
              max={1}
              label={STYLE_REFERENCE_LABEL}
              subtitle={STYLE_REFERENCE_SUBTITLE}
              hint={STYLE_REFERENCE_HINT}
              ariaLabel={STYLE_REFERENCE_LABEL}
              disabled={busy}
              onAppend={onStyleReferenceAppend}
              onRemove={onStyleReferenceRemove}
            />
          </>
        ) : null}
      </div>
      <div className={styles.footer}>
        {researchStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={phase === 'researching'}
            disabled={!idea.trim()}
            onClick={onResearch}
          >
            {RESEARCH_BUTTON}
          </Button>
        ) : null}
        {planStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={phase === 'planning'}
            disabled={!selectedAngle}
            onClick={onPlan}
          >
            {PLAN_BUTTON}
          </Button>
        ) : null}
        {draftStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={phase === 'drafting'}
            disabled={!plan || !hasStyleSelection(styleSelections)}
            onClick={onDraft}
          >
            {DRAFT_BUTTON}
          </Button>
        ) : null}
        {imagesStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={phase === 'illustrating'}
            disabled={!hasMarkdown}
            onClick={onPlanImages}
          >
            {PLAN_IMAGES_BUTTON}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
