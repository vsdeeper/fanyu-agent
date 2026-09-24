import { Button, Form, Input, Select, type FormInstance } from 'antd';
import TopicCardView from '../TopicCardView';
import {
  GENRE_LABEL,
  GENRE_OPTIONS,
  GENRE_PLACEHOLDER,
  IDEA_LABEL,
  IDEA_PLACEHOLDER,
  MISSING_IDEA_WARNING,
  RESEARCH_BUTTON,
  SELECTED_TOPIC_EMPTY,
  SELECTED_TOPIC_LABEL,
  STRUCTURE_BUTTON,
  VOLUME_LABEL,
  VOLUME_OPTIONS,
} from '../constants';
import type { NovelPanelValues, StudioPhase, TopicCard } from '../types';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<NovelPanelValues>;
  initialValues: NovelPanelValues;
  phase: StudioPhase;
  selectedTopic?: TopicCard;
  onResearch: () => void;
  onGenerateStructure: () => void;
};

/** 小说左栏：调研表单与结构步只读选题共用一份 Form store，切步不丢值。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  selectedTopic,
  onResearch,
  onGenerateStructure,
}: ControlPanelProps) {
  const researchBusy = phase === 'researching';
  const structureBusy = phase === 'structuring';
  const researchStep =
    phase === 'research' || phase === 'researching' || phase === 'researched';
  const structureStep =
    phase === 'structure' || phase === 'structuring' || phase === 'structured';
  const busy = researchBusy || structureBusy;

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {/*
          两步共用一个 Form：切步骤只换注册的 Form.Item 集合（preserve 默认 true），
          不重挂 Form，体量等字段才能在结构步继续被读取。
        */}
        <Form
          form={form}
          initialValues={initialValues}
          layout="vertical"
          disabled={busy}
          className={styles.form}
        >
          {researchStep ? (
            <>
              <Form.Item
                name="idea"
                label={IDEA_LABEL}
                rules={[{ required: true, whitespace: true, message: MISSING_IDEA_WARNING }]}
              >
                <Input.TextArea rows={6} placeholder={IDEA_PLACEHOLDER} />
              </Form.Item>
              <Form.Item name="genres" label={GENRE_LABEL}>
                <Select
                  mode="multiple"
                  allowClear
                  options={[...GENRE_OPTIONS]}
                  placeholder={GENRE_PLACEHOLDER}
                  showSearch={{ optionFilterProp: 'label' }}
                />
              </Form.Item>
              <Form.Item name="volume" label={VOLUME_LABEL}>
                <Select options={VOLUME_OPTIONS} />
              </Form.Item>
            </>
          ) : null}

          {structureStep ? (
            <div className={styles.topicBlock}>
              <div className={styles.topicLabel}>{SELECTED_TOPIC_LABEL}</div>
              {selectedTopic ? (
                <TopicCardView topic={selectedTopic} />
              ) : (
                <p className={styles.topicEmpty}>{SELECTED_TOPIC_EMPTY}</p>
              )}
            </div>
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
            loading={researchBusy}
            onClick={onResearch}
          >
            {RESEARCH_BUTTON}
          </Button>
        ) : null}
        {structureStep ? (
          <Button
            className={styles.actionBtn}
            type="primary"
            block
            size="large"
            loading={structureBusy}
            disabled={!selectedTopic}
            onClick={onGenerateStructure}
          >
            {STRUCTURE_BUTTON}
          </Button>
        ) : null}
      </div>
    </aside>
  );
}
