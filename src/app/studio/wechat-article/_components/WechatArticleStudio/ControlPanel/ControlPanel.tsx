import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Space, type FormInstance } from 'antd';
import StyleDimensionPicker, {
  StyleClipboardActions,
  hasStyleSelection,
  type StyleDimensionSelections,
} from '@/business-components/StyleDimensionPicker';
import StudioImageUpload from '@/business-components/StudioImageUpload';
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
  MISSING_RESEARCH_INPUT_WARNING,
  MISSING_STYLE_WARNING,
  PLAN_BUTTON,
  PLAN_IMAGES_BUTTON,
  RESEARCH_BUTTON,
  SELECTED_ANGLE_EMPTY,
  SELECTED_ANGLE_LABEL,
  STYLE_LABEL,
  STYLE_REFERENCE_HINT,
  STYLE_REFERENCE_LABEL,
  STYLE_REFERENCE_SUBTITLE,
  WATERMARK_ARIA_LABEL,
  WATERMARK_HINT,
  WATERMARK_LABEL,
  WATERMARK_SUBTITLE,
} from '../constants';
import type { AngleCard, PlanStepSnapshot, StudioPhase, WechatPanelValues } from '../types';
import { resolvePlanTitle } from '../utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<WechatPanelValues>;
  initialValues: WechatPanelValues;
  phase: StudioPhase;
  /** 左栏字段变化；水印图与风格参考图是「改完即落盘」，其余字段等各自步骤的动作统一落盘 */
  onFieldChange: (changed: Partial<WechatPanelValues>) => void;
  selectedAngle?: AngleCard;
  plan?: PlanStepSnapshot;
  hasMarkdown: boolean;
  onResearch: () => void;
  onPlan: () => void;
  onDraft: () => void;
  onPlanImages: () => void;
};

/** 公众号左栏：按当前步骤展示想法 / 思路参数 / 成稿文风 / 配图水印与风格参考。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  onFieldChange,
  selectedAngle,
  plan,
  hasMarkdown,
  onResearch,
  onPlan,
  onDraft,
  onPlanImages,
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
  // 复制/粘贴按钮要拿到当前选择，故这里单独订一个字段
  const styleSelections =
    Form.useWatch('styleSelections', { form, preserve: true }) ?? initialValues.styleSelections;

  /**
   * 粘贴整份文风。
   *
   * 走 store 直写：`setFieldsValue` 不触发 onValuesChange（也不会自动重校验），
   * 故随后补一次针对该字段的校验，清掉粘贴前留下的行内报错。
   */
  const applyStyleSelections = (next: StyleDimensionSelections) => {
    form.setFieldsValue({ styleSelections: next });
    void form.validateFields(['styleSelections']).catch(() => undefined);
  };

  /** 想法 / 经历 / 观点至少填一项；挂在「我的想法」上，另两字段变更时通过 dependencies 重校验。 */
  const atLeastOneResearchInput = {
    validator: async () => {
      const idea = String(form.getFieldValue('idea') ?? '').trim();
      const experience = String(form.getFieldValue('experience') ?? '').trim();
      const viewpoint = String(form.getFieldValue('viewpoint') ?? '').trim();
      if (idea || experience || viewpoint) return;
      throw new Error(MISSING_RESEARCH_INPUT_WARNING);
    },
  };

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {/*
          四个步骤共用一个 Form：切步骤只换注册的 Form.Item 集合（preserve 默认 true，值仍留在 store），
          不重挂 Form。左栏值的唯一真相是这份 store，读值一律用 getFieldsValue(true)；
          不要加 clearOnDestroy，也不要改成 component={false}。
        */}
        <Form
          form={form}
          initialValues={initialValues}
          layout="vertical"
          disabled={busy}
          className={styles.form}
          onValuesChange={onFieldChange}
        >
          {researchStep ? (
            <>
              <Form.Item
                name="idea"
                label="我的想法"
                dependencies={['viewpoint', 'experience']}
                rules={[atLeastOneResearchInput]}
              >
                <Input.TextArea rows={4} placeholder="例如：AI agent 开始替人逛电商" />
              </Form.Item>
              <Form.Item name="viewpoint" label="我的观点">
                <Input.TextArea rows={4} placeholder="例如：国外已经在落地，国内还在聊概念" />
              </Form.Item>
              <Form.Item name="experience" label="我的经历">
                <Input.TextArea
                  rows={4}
                  placeholder="例如：有个朋友失业了，月供六千，账上只剩三万"
                />
              </Form.Item>
            </>
          ) : null}

          {planStep ? (
            <div className={styles.angleBlock}>
              <div className={styles.angleLabel}>{SELECTED_ANGLE_LABEL}</div>
              {selectedAngle ? (
                <AngleCardView angle={selectedAngle} />
              ) : (
                <p className={styles.angleEmpty}>{SELECTED_ANGLE_EMPTY}</p>
              )}
            </div>
          ) : null}

          {draftStep ? (
            <>
              {/* 标题在右栏点选标题方向时确定，这里只读回显；成稿前必须有，故标为必填 */}
              <Form.Item label={DRAFT_TITLE_LABEL} required>
                <Input value={draftTitle ?? ''} placeholder={DRAFT_TITLE_EMPTY} readOnly />
              </Form.Item>
              {/* 修复：name 必须挂在 InputNumber 上。Form.Item 只把 value/onChange 注入**直接子元素**，
                  隔一层 Space.Compact 时它们被透传到外层 div，字段收不到用户输入——
                  getFieldsValue 里 lengthLimit 恒为 undefined，成稿请求与快照都丢这个键 */}
              <Form.Item label={LENGTH_LIMIT_LABEL}>
                <Space.Compact className={styles.lengthLimit} block>
                  <Form.Item
                    name="lengthLimit"
                    noStyle
                    // InputNumber 清空时给的是 null，落盘要的是「不写这个键」，故在这里归一成 undefined
                    normalize={(value: number | null) =>
                      typeof value === 'number' ? value : undefined
                    }
                  >
                    <InputNumber
                      min={LENGTH_LIMIT_MIN}
                      max={LENGTH_LIMIT_MAX}
                      step={100}
                      placeholder={LENGTH_LIMIT_PLACEHOLDER}
                    />
                  </Form.Item>
                  <Space.Addon>{LENGTH_LIMIT_SUFFIX}</Space.Addon>
                </Space.Compact>
              </Form.Item>
              {/* 复制/粘贴浮在「文风」标签行右侧（见 module.css 的 styleActions）：
                  不进 Form.Item 的 label，否则 `<button>` 会被 label 隐式关联。 */}
              <div className={styles.styleRow}>
                <Form.Item
                  name="styleSelections"
                  label={STYLE_LABEL}
                  rules={[
                    {
                      // 「一张卡片都没选」不能写成 { required: true }：值是对象，空对象会被判成非空
                      validator: (_rule, value: StyleDimensionSelections | undefined) =>
                        hasStyleSelection(value ?? {})
                          ? Promise.resolve()
                          : Promise.reject(new Error(MISSING_STYLE_WARNING)),
                    },
                  ]}
                >
                  <StyleDimensionPicker disabled={busy} />
                </Form.Item>
                <StyleClipboardActions
                  className={styles.styleActions}
                  selections={styleSelections}
                  disabled={busy}
                  onPaste={applyStyleSelections}
                />
              </div>
            </>
          ) : null}

          {imagesStep ? (
            <>
              <Form.Item name="watermarkImages">
                <StudioImageUpload
                  max={1}
                  label={WATERMARK_LABEL}
                  subtitle={WATERMARK_SUBTITLE}
                  hint={WATERMARK_HINT}
                  ariaLabel={WATERMARK_ARIA_LABEL}
                  disabled={busy}
                />
              </Form.Item>
              <Form.Item name="styleReferenceImages">
                <StudioImageUpload
                  max={1}
                  label={STYLE_REFERENCE_LABEL}
                  subtitle={STYLE_REFERENCE_SUBTITLE}
                  hint={STYLE_REFERENCE_HINT}
                  ariaLabel={STYLE_REFERENCE_LABEL}
                  disabled={busy}
                />
              </Form.Item>
            </>
          ) : null}
        </Form>
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
            disabled={!plan}
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
