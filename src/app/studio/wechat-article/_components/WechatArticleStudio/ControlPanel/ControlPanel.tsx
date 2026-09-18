import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, Input, InputNumber, Space } from 'antd';
import StyleDimensionPicker, {
  hasStyleSelection,
  type StyleDimensionSelections,
} from '@/business-components/StyleDimensionPicker';
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
  RESEARCH_BUTTON,
  STYLE_LABEL,
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
  onIdeaChange: (value: string) => void;
  onViewpointChange: (value: string) => void;
  onStyleSelectionsChange: (value: StyleDimensionSelections) => void;
  onLengthLimitChange: (value: number | undefined) => void;
  onResearch: () => void;
  onPlan: () => void;
  onDraft: () => void;
  selectedAngle?: AngleCard;
  plan?: PlanStepSnapshot;
};

/** 公众号左栏：按当前步骤展示想法 / 思路参数 / 成稿文风（Ant Design Form）。 */
export default function ControlPanel({
  phase,
  idea,
  viewpoint,
  styleSelections,
  lengthLimit,
  onIdeaChange,
  onViewpointChange,
  onStyleSelectionsChange,
  onLengthLimitChange,
  onResearch,
  onPlan,
  onDraft,
  selectedAngle,
  plan,
}: ControlPanelProps) {
  const busy = phase === 'researching' || phase === 'planning' || phase === 'drafting';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planStep = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const draftStep = phase === 'draft' || phase === 'drafting' || phase === 'drafted';
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
              <Input.TextArea
                rows={3}
                value={draftTitle ?? ''}
                placeholder={DRAFT_TITLE_EMPTY}
                readOnly
              />
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
            <Form.Item label={STYLE_LABEL} required>
              <StyleDimensionPicker
                selections={styleSelections}
                disabled={busy}
                onChange={onStyleSelectionsChange}
              />
            </Form.Item>
          </Form>
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
      </div>
    </aside>
  );
}
