import { useState } from 'react';
import { HighlightOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Modal, Select } from 'antd';
import type { AssistStylePromptResult } from '@/app/api/studio/style-tuning/_shared/assist-style-prompt';
import type { StyleTuningPublishScene } from '@/app/api/studio/style-tuning/_shared/types';
import { apiPost } from '@/lib/shared/client/api-client';
import {
  AI_ASSIST_BUTTON,
  AI_ASSIST_CANCEL_BUTTON,
  AI_ASSIST_GENERATE_BUTTON,
  AI_ASSIST_MODAL_TITLE,
  ASSIST_STYLE_PROMPT_FAILED,
  CONTENT_OUTLINE_PLACEHOLDER,
  MISSING_STYLE_SAMPLES_WARNING,
  PUBLISH_SCENE_OPTIONS,
  SOFT_TUNE_BUTTON,
  STYLE_PROMPT_PLACEHOLDER,
  STYLE_SAMPLES_MODAL_PLACEHOLDER,
  TOPIC_CONTENT_PLACEHOLDER,
  TRIAL_WRITE_BUTTON,
} from '../constants';
import type { StudioPhase } from '../types';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  phase: StudioPhase;
  publishScene?: StyleTuningPublishScene;
  topicContent: string;
  stylePrompt: string;
  contentOutline: string;
  onPublishSceneChange: (value: StyleTuningPublishScene) => void;
  onTopicContentChange: (value: string) => void;
  onStylePromptChange: (value: string) => void;
  onContentOutlineChange: (value: string) => void;
  onSoftTune: () => void;
  onTrialWrite: () => void;
};

/** 文风调左栏：软调输入或试写内容梗概。 */
export default function ControlPanel({
  phase,
  publishScene,
  topicContent,
  stylePrompt,
  contentOutline,
  onPublishSceneChange,
  onTopicContentChange,
  onStylePromptChange,
  onContentOutlineChange,
  onSoftTune,
  onTrialWrite,
}: ControlPanelProps) {
  const { message } = App.useApp();
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistSamples, setAssistSamples] = useState('');
  const [assistLoading, setAssistLoading] = useState(false);

  const busy = phase === 'softtuning' || phase === 'trialwriting';
  const softStep = phase === 'softtune' || phase === 'softtuning' || phase === 'softtuned';
  const trialStep = phase === 'trialwrite' || phase === 'trialwriting' || phase === 'trialwritten';

  async function handleAssistGenerate() {
    if (!assistSamples.trim()) {
      message.warning(MISSING_STYLE_SAMPLES_WARNING);
      return;
    }
    setAssistLoading(true);
    try {
      const data = await apiPost<AssistStylePromptResult>(
        '/api/studio/style-tuning/assist-style-prompt',
        { styleSamples: assistSamples.trim() },
      );
      onStylePromptChange(data.stylePrompt);
      setAssistOpen(false);
      setAssistSamples('');
    } catch (err) {
      console.error('[style-tuning] assist-style-prompt', err);
      message.error(err instanceof Error && err.message ? err.message : ASSIST_STYLE_PROMPT_FAILED);
    } finally {
      setAssistLoading(false);
    }
  }

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
            <Form.Item
              label={
                <span className={styles.stylePromptLabel}>
                  <span>文风提示词</span>
                  <Button
                    type="link"
                    size="small"
                    className={styles.assistLink}
                    disabled={busy}
                    onClick={(event) => {
                      event.preventDefault();
                      setAssistOpen(true);
                    }}
                  >
                    {AI_ASSIST_BUTTON}
                  </Button>
                </span>
              }
              required
            >
              <Input.TextArea
                rows={8}
                value={stylePrompt}
                placeholder={STYLE_PROMPT_PLACEHOLDER}
                onChange={(event) => onStylePromptChange(event.target.value)}
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
            disabled={!publishScene || !topicContent.trim() || !stylePrompt.trim()}
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

      <Modal
        title={AI_ASSIST_MODAL_TITLE}
        open={assistOpen}
        onCancel={() => {
          if (assistLoading) return;
          setAssistOpen(false);
          setAssistSamples('');
        }}
        footer={[
          <Button
            key="cancel"
            disabled={assistLoading}
            onClick={() => {
              setAssistOpen(false);
              setAssistSamples('');
            }}
          >
            {AI_ASSIST_CANCEL_BUTTON}
          </Button>,
          <Button
            key="generate"
            type="primary"
            loading={assistLoading}
            disabled={!assistSamples.trim()}
            onClick={() => void handleAssistGenerate()}
          >
            {AI_ASSIST_GENERATE_BUTTON}
          </Button>,
        ]}
        destroyOnHidden
        mask={{ closable: !assistLoading }}
        closable={!assistLoading}
      >
        <Input.TextArea
          rows={10}
          value={assistSamples}
          placeholder={STYLE_SAMPLES_MODAL_PLACEHOLDER}
          disabled={assistLoading}
          onChange={(event) => setAssistSamples(event.target.value)}
        />
      </Modal>
    </aside>
  );
}
