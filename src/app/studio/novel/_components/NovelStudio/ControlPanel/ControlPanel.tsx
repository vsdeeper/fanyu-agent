import { Button, Form, Input, Select, type FormInstance } from 'antd';
import StyleDimensionPicker, {
  StyleClipboardActions,
  type StyleDimensionSelections,
} from '@/app/studio/_components/StyleDimensionPicker';
import TopicCardView from '../TopicCardView';
import {
  GENRE_LABEL,
  GENRE_OPTIONS,
  GENRE_PLACEHOLDER,
  IDEA_LABEL,
  IDEA_PLACEHOLDER,
  LONG_FORMAT_LABEL,
  LONG_FORMAT_OPTIONS,
  MISSING_IDEA_WARNING,
  RESEARCH_BUTTON,
  SELECTED_TOPIC_EMPTY,
  SELECTED_TOPIC_LABEL,
  STRUCTURE_BUTTON,
  STYLE_LABEL,
  VOLUME_LABEL,
  VOLUME_OPTIONS,
} from '../constants';
import type { NovelPanelValues, StructureSnapshot, StudioPhase, TopicCard } from '../types';
import WritingUnitList from './WritingUnitList';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<NovelPanelValues>;
  initialValues: NovelPanelValues;
  phase: StudioPhase;
  selectedTopic?: TopicCard;
  structure?: StructureSnapshot;
  selectedUnitIds: string[];
  focusUnitId?: string;
  styleSelections: StyleDimensionSelections;
  writeBusy?: boolean;
  onResearch: () => void;
  onGenerateStructure: () => void;
  onToggleWritingUnit: (unitId: string) => void;
  onStyleSelectionsChange: (next: StyleDimensionSelections) => void;
};

/** 小说左栏：调研表单 / 结构选题 / 写作文风+单元；Form 仅挂在调研步。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  selectedTopic,
  structure,
  selectedUnitIds,
  focusUnitId,
  styleSelections,
  writeBusy = false,
  onResearch,
  onGenerateStructure,
  onToggleWritingUnit,
  onStyleSelectionsChange,
}: ControlPanelProps) {
  const researchBusy = phase === 'researching';
  const structureBusy = phase === 'structuring';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const structureStep = phase === 'structure' || phase === 'structuring' || phase === 'structured';
  const writeStep = phase === 'write' || phase === 'writing' || phase === 'written';
  const showFooter = researchStep || structureStep;
  const volume = Form.useWatch('volume', form);

  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>
        {researchStep ? (
          <Form
            form={form}
            initialValues={initialValues}
            layout="vertical"
            disabled={researchBusy}
            className={styles.form}
          >
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
            {volume === 'long' ? (
              <Form.Item name="longFormat" label={LONG_FORMAT_LABEL}>
                <Select options={LONG_FORMAT_OPTIONS} />
              </Form.Item>
            ) : null}
          </Form>
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

        {writeStep && structure ? (
          <>
            <div className={styles.styleRow}>
              <div className={styles.styleLabel}>{STYLE_LABEL}</div>
              <StyleClipboardActions
                className={styles.styleActions}
                selections={styleSelections}
                disabled={writeBusy}
                onPaste={onStyleSelectionsChange}
              />
              <StyleDimensionPicker
                value={styleSelections}
                disabled={writeBusy}
                onChange={onStyleSelectionsChange}
              />
            </div>
            <WritingUnitList
              structure={structure}
              selectedUnitIds={selectedUnitIds}
              focusUnitId={focusUnitId}
              onToggle={onToggleWritingUnit}
            />
          </>
        ) : null}
      </div>
      {showFooter ? (
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
      ) : null}
    </aside>
  );
}
