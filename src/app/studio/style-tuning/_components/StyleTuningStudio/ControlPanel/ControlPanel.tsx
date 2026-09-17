import { HighlightOutlined } from '@ant-design/icons';
import { Button, Form, Input, Select } from 'antd';
import type { StyleTuningPublishScene } from '@/app/api/studio/style-tuning/_shared/types';
import {
  CONTENT_OUTLINE_PLACEHOLDER,
  PUBLISH_SCENE_OPTIONS,
  SOFT_TUNE_BUTTON,
  STYLE_LABEL,
  TOPIC_CONTENT_PLACEHOLDER,
  TRIAL_WRITE_BUTTON,
} from '../constants';
import type { StudioPhase, StyleDimensionSelections } from '../types';
import { hasStyleSelection } from '../utils';
import StyleDimensionPicker from './StyleDimensionPicker';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  phase: StudioPhase;
  publishScene?: StyleTuningPublishScene;
  topicContent: string;
  styleSelections: StyleDimensionSelections;
  contentOutline: string;
  onPublishSceneChange: (value: StyleTuningPublishScene) => void;
  onTopicContentChange: (value: string) => void;
  onStyleSelectionsChange: (value: StyleDimensionSelections) => void;
  onContentOutlineChange: (value: string) => void;
  onSoftTune: () => void;
  onTrialWrite: () => void;
};

/** 文风调左栏：软调输入或试写内容梗概。 */
export default function ControlPanel({
  phase,
  publishScene,
  topicContent,
  styleSelections,
  contentOutline,
  onPublishSceneChange,
  onTopicContentChange,
  onStyleSelectionsChange,
  onContentOutlineChange,
  onSoftTune,
  onTrialWrite,
}: ControlPanelProps) {
  const busy = phase === 'softtuning' || phase === 'trialwriting';
  const softStep = phase === 'softtune' || phase === 'softtuning' || phase === 'softtuned';
  const trialStep = phase === 'trialwrite' || phase === 'trialwriting' || phase === 'trialwritten';

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {softStep ? (
          <Form layout="vertical" requiredMark disabled={busy} className={styles.form}>
            <Form.Item label="发布场景" required>
              <Select
                value={publishScene}
                placeholder="选择发布场景"
                options={PUBLISH_SCENE_OPTIONS}
                onChange={onPublishSceneChange}
              />
            </Form.Item>
            <Form.Item label="主题内容" required>
              <Input.TextArea
                rows={5}
                value={topicContent}
                placeholder={TOPIC_CONTENT_PLACEHOLDER}
                onChange={(event) => onTopicContentChange(event.target.value)}
              />
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

        {trialStep ? (
          <Form layout="vertical" requiredMark={false} disabled={busy} className={styles.form}>
            <Form.Item label="内容梗概">
              <Input.TextArea
                rows={10}
                value={contentOutline}
                placeholder={CONTENT_OUTLINE_PLACEHOLDER}
                onChange={(event) => onContentOutlineChange(event.target.value)}
              />
            </Form.Item>
          </Form>
        ) : null}
      </div>
      <div className={styles.footer}>
        {softStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={phase === 'softtuning'}
            disabled={!publishScene || !topicContent.trim() || !hasStyleSelection(styleSelections)}
            onClick={onSoftTune}
          >
            {SOFT_TUNE_BUTTON}
          </Button>
        ) : null}
        {trialStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            icon={<HighlightOutlined />}
            loading={phase === 'trialwriting'}
            disabled={!topicContent.trim()}
            onClick={onTrialWrite}
          >
            {TRIAL_WRITE_BUTTON}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
