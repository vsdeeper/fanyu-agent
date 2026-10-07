import { Button, Form, Input, Select, type FormInstance } from 'antd';
import StyleDimensionPicker, {
  StyleClipboardActions,
  type StyleDimensionSelections,
} from '@/app/studio/_components/StyleDimensionPicker';
import StudioControlPanel, {
  studioControlFormClassName,
} from '@/app/studio/_components/StudioControlPanel';
import TopicCardView from '../TopicCardView';
import {
  GENRE_LABEL,
  GENRE_OPTIONS,
  GENRE_PLACEHOLDER,
  IDEA_LABEL,
  BIBLE_BUTTON,
  BIBLE_HIDDEN_AXIS_LABELS,
  IDEA_PLACEHOLDER,
  LONG_FORMAT_LABEL,
  LONG_FORMAT_OPTIONS,
  MISSING_IDEA_WARNING,
  RESEARCH_BUTTON,
  SELECTED_TOPIC_EMPTY,
  SELECTED_TOPIC_LABEL,
  NARRATION_TITLE,
  STRUCTURE_BUTTON,
  STYLE_LABEL,
  TENSE_LABEL,
  TENSE_OPTIONS,
  VOLUME_LABEL,
  VOLUME_OPTIONS,
  WRITE_HIDDEN_AXIS_LABELS,
} from '../constants';
import type {
  NovelPanelValues,
  NovelTense,
  StructureSnapshot,
  StudioPhase,
  TopicCard,
} from '../types';
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
  bibleVoiceFocus: StyleDimensionSelections;
  bibleTense?: NovelTense;
  writeBusy?: boolean;
  onResearch: () => void;
  onGenerateBible: () => void;
  onBibleVoiceFocusChange: (next: StyleDimensionSelections) => void;
  onBibleTenseChange: (tense: NovelTense) => void;
  onGenerateStructure: () => void;
  onToggleWritingUnit: (unitId: string) => void;
  onStyleSelectionsChange: (next: StyleDimensionSelections) => void;
};

/** 小说左栏：调研、设定、结构、写作共用一个 Form。 */
export default function ControlPanel({
  form,
  initialValues,
  phase,
  selectedTopic,
  structure,
  selectedUnitIds,
  focusUnitId,
  styleSelections,
  bibleVoiceFocus,
  bibleTense,
  writeBusy = false,
  onResearch,
  onGenerateBible,
  onBibleVoiceFocusChange,
  onBibleTenseChange,
  onGenerateStructure,
  onToggleWritingUnit,
  onStyleSelectionsChange,
}: ControlPanelProps) {
  const researchBusy = phase === 'researching';
  const bibleBusy = phase === 'bibling';
  const structureBusy = phase === 'structuring';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const bibleStep = phase === 'bible' || phase === 'bibling' || phase === 'bibled';
  const structureStep = phase === 'structure' || phase === 'structuring' || phase === 'structured';
  const writeStep = phase === 'write' || phase === 'writing' || phase === 'written';
  const showFooter = researchStep || bibleStep || structureStep;
  const volume = Form.useWatch('volume', form);
  const formDisabled =
    (researchStep && researchBusy) || (bibleStep && bibleBusy) || (writeStep && writeBusy);

  return (
    <StudioControlPanel
      footer={
        showFooter ? (
          <>
            {researchStep ? (
              <Button type="primary" block size="large" loading={researchBusy} onClick={onResearch}>
                {RESEARCH_BUTTON}
              </Button>
            ) : null}
            {bibleStep ? (
              <Button
                type="primary"
                block
                size="large"
                loading={bibleBusy}
                disabled={!selectedTopic}
                onClick={onGenerateBible}
              >
                {BIBLE_BUTTON}
              </Button>
            ) : null}
            {structureStep ? (
              <Button
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
          </>
        ) : undefined
      }
    >
      {/* 各步共用这一份 Form，切步只换里面的字段，避免叙述、时态和文风落在 Form 外面。 */}
      <Form
        form={form}
        initialValues={initialValues}
        layout="vertical"
        disabled={formDisabled}
        className={studioControlFormClassName}
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
            {volume === 'long' ? (
              <Form.Item name="longFormat" label={LONG_FORMAT_LABEL}>
                <Select options={LONG_FORMAT_OPTIONS} />
              </Form.Item>
            ) : null}
          </>
        ) : null}

        {bibleStep || structureStep ? (
          <div className={styles.topicBlock}>
            <div className={styles.topicLabel}>{SELECTED_TOPIC_LABEL}</div>
            {selectedTopic ? (
              <TopicCardView topic={selectedTopic} />
            ) : (
              <p className={styles.topicEmpty}>{SELECTED_TOPIC_EMPTY}</p>
            )}
          </div>
        ) : null}

        {bibleStep ? (
          <>
            <Form.Item label={NARRATION_TITLE}>
              <StyleDimensionPicker
                value={bibleVoiceFocus}
                hiddenAxisLabels={BIBLE_HIDDEN_AXIS_LABELS}
                disabled={bibleBusy}
                onChange={onBibleVoiceFocusChange}
              />
            </Form.Item>
            <Form.Item label={TENSE_LABEL}>
              <Select
                value={bibleTense}
                options={TENSE_OPTIONS}
                placeholder={TENSE_LABEL}
                disabled={bibleBusy}
                onChange={onBibleTenseChange}
              />
            </Form.Item>
          </>
        ) : null}

        {writeStep && structure ? (
          <>
            <div className={styles.styleRow}>
              <Form.Item label={STYLE_LABEL}>
                <StyleDimensionPicker
                  value={styleSelections}
                  hiddenAxisLabels={WRITE_HIDDEN_AXIS_LABELS}
                  disabled={writeBusy}
                  onChange={onStyleSelectionsChange}
                />
              </Form.Item>
              <StyleClipboardActions
                className={styles.styleActions}
                selections={styleSelections}
                disabled={writeBusy}
                onPaste={onStyleSelectionsChange}
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
      </Form>
    </StudioControlPanel>
  );
}
