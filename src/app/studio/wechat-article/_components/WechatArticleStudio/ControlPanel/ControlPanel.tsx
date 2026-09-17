import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select, Switch } from 'antd';
import {
  DRAFT_BUTTON,
  PLAN_BUTTON,
  RESEARCH_BUTTON,
  STYLE_SAMPLES_PLACEHOLDER,
} from '../constants';
import type { PlanStepSnapshot, StudioPhase } from '../types';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  phase: StudioPhase;
  idea: string;
  audience: string;
  stance: string;
  bannedWords: string;
  mustUseDetails: string;
  draftTone: string;
  deAiFlavor: boolean;
  styleSamplesText: string;
  onIdeaChange: (value: string) => void;
  onAudienceChange: (value: string) => void;
  onStanceChange: (value: string) => void;
  onBannedWordsChange: (value: string) => void;
  onMustUseDetailsChange: (value: string) => void;
  onDraftToneChange: (value: string) => void;
  onDeAiFlavorChange: (value: boolean) => void;
  onStyleSamplesChange: (value: string) => void;
  onResearch: () => void;
  onPlan: () => void;
  onDraft: () => void;
  selectedAngleClaim?: string;
  plan?: PlanStepSnapshot;
};

/** 公众号左栏：按当前步骤展示想法 / 思路参数 / 成稿风格（Ant Design Form）。 */
export default function ControlPanel({
  phase,
  idea,
  audience,
  stance,
  bannedWords,
  mustUseDetails,
  draftTone,
  deAiFlavor,
  styleSamplesText,
  onIdeaChange,
  onAudienceChange,
  onStanceChange,
  onBannedWordsChange,
  onMustUseDetailsChange,
  onDraftToneChange,
  onDeAiFlavorChange,
  onStyleSamplesChange,
  onResearch,
  onPlan,
  onDraft,
  selectedAngleClaim,
  plan,
}: ControlPanelProps) {
  const busy = phase === 'researching' || phase === 'planning' || phase === 'drafting';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planStep = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const draftStep = phase === 'draft' || phase === 'drafting' || phase === 'drafted';

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {researchStep ? (
          <Form layout="vertical" requiredMark disabled={busy} className={styles.form}>
            <Form.Item label="一句话想法" required>
              <Input.TextArea
                rows={4}
                value={idea}
                placeholder="例如：AI agent 开始替人逛电商"
                onChange={(event) => onIdeaChange(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="目标受众">
              <Input
                value={audience}
                placeholder="例如：25–35 岁产品经理"
                onChange={(event) => onAudienceChange(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="立场 / 倾向">
              <Input.TextArea
                rows={3}
                value={stance}
                placeholder="例如：国外已经在落地，国内还在聊概念"
                onChange={(event) => onStanceChange(event.target.value)}
              />
            </Form.Item>
          </Form>
        ) : null}

        {planStep ? (
          <Form layout="vertical" disabled={busy} className={styles.form}>
            <Form.Item label="锁定角度">
              <Input.TextArea rows={3} value={selectedAngleClaim ?? ''} disabled />
            </Form.Item>
            <Form.Item label="禁词">
              <Input.TextArea
                rows={2}
                value={bannedWords}
                placeholder="赋能、闭环、值得关注…"
                onChange={(event) => onBannedWordsChange(event.target.value)}
              />
            </Form.Item>
            <Form.Item label="必用细节">
              <Input.TextArea
                rows={3}
                value={mustUseDetails}
                placeholder="必须写进思路的数字、原话、产品名"
                onChange={(event) => onMustUseDetailsChange(event.target.value)}
              />
            </Form.Item>
          </Form>
        ) : null}

        {draftStep ? (
          <Form layout="vertical" disabled={busy} className={styles.form}>
            <Form.Item label="语气">
              <Select
                value={draftTone || undefined}
                allowClear
                placeholder="选择语气"
                options={[
                  { value: '编辑部口述', label: '编辑部口述' },
                  { value: '特稿', label: '特稿' },
                  { value: '口播转写', label: '口播转写' },
                ]}
                onChange={(value) => onDraftToneChange(value ?? '')}
              />
            </Form.Item>
            <Form.Item label="去 AI 味">
              <Switch checked={deAiFlavor} onChange={onDeAiFlavorChange} />
            </Form.Item>
            <Form.Item label="风格样本">
              <Input.TextArea
                rows={8}
                value={styleSamplesText}
                placeholder={STYLE_SAMPLES_PLACEHOLDER}
                onChange={(event) => onStyleSamplesChange(event.target.value)}
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
            disabled={!selectedAngleClaim}
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
      </div>
    </aside>
  );
}
