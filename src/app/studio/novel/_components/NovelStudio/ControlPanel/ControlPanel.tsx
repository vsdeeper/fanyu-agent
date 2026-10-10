import { useEffect } from 'react';
import { Button, Form, Input, Select, type FormInstance } from 'antd';
import {
  DEEPSEEK_REASONING_EFFORTS,
  ZHIPU_REASONING_EFFORTS,
} from '@/app/api/chat/_shared/chat-settings';
import type { NovelReasoningEffort } from '@/app/api/studio/novel/_shared/constants';
import { useChatSettingsStore } from '@/stores/chat-settings';
import StyleDimensionPicker, {
  StyleClipboardActions,
  type StyleDimensionSelections,
} from '@/app/studio/_components/StyleDimensionPicker';
import ProductDocsUpload from '@/app/studio/_components/ProductDocsUpload';
import StudioControlPanel, {
  studioControlFormClassName,
} from '@/app/studio/_components/StudioControlPanel';
import TopicCardView from '../TopicCardView';
import {
  GENRE_LABEL,
  GENRE_OPTIONS,
  GENRE_PLACEHOLDER,
  IDEA_FILE_ACCEPT,
  IDEA_FILE_HINT,
  IDEA_FILE_LABEL,
  IDEA_FILE_MAX,
  IDEA_FILE_SUBTITLE,
  IDEA_FILE_TYPE_WARNING,
  IDEA_LABEL,
  BIBLE_BUTTON,
  BIBLE_HIDDEN_AXIS_LABELS,
  IDEA_PLACEHOLDER,
  LONG_FORMAT_LABEL,
  LONG_FORMAT_OPTIONS,
  RESEARCH_BUTTON,
  REASONING_EFFORT_LABEL,
  REASONING_EFFORT_OPTION_LABEL,
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
import { isAllowedIdeaFile, requireIdeaOrFile } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<NovelPanelValues>;
  initialValues: NovelPanelValues;
  reasoningEffort: NovelReasoningEffort;
  onReasoningEffortChange: (next: NovelReasoningEffort) => void;
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
  reasoningEffort,
  onReasoningEffortChange,
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
  const chatProvider = useChatSettingsStore((state) => state.settings?.chatProvider);
  const settingsHydrated = useChatSettingsStore((state) => state.hydrated);
  useEffect(() => {
    if (!settingsHydrated) useChatSettingsStore.getState().hydrate();
  }, [settingsHydrated]);
  const reasoningOptions =
    chatProvider === 'zhipu' ? ZHIPU_REASONING_EFFORTS : DEEPSEEK_REASONING_EFFORTS;
  const reasoningValue = (reasoningOptions as readonly string[]).includes(reasoningEffort)
    ? reasoningEffort
    : 'max';
  const showReasoningEffort = settingsHydrated && chatProvider !== 'ark' && Boolean(chatProvider);

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
              name="ideaFiles"
              dependencies={['idea']}
              rules={[
                {
                  validator: async (_, value: NovelPanelValues['ideaFiles'] | undefined) => {
                    await requireIdeaOrFile(form.getFieldValue('idea'), value);
                  },
                },
              ]}
            >
              <ProductDocsUpload
                max={IDEA_FILE_MAX}
                label={IDEA_FILE_LABEL}
                subtitle={IDEA_FILE_SUBTITLE}
                hint={IDEA_FILE_HINT}
                accept={IDEA_FILE_ACCEPT}
                typeWarning={IDEA_FILE_TYPE_WARNING}
                isAllowedFile={isAllowedIdeaFile}
                ariaLabel="上传思路文件"
                disabled={researchBusy}
              />
            </Form.Item>
            <Form.Item
              name="idea"
              label={IDEA_LABEL}
              dependencies={['ideaFiles']}
              rules={[
                {
                  validator: async (_, value: string | undefined) => {
                    await requireIdeaOrFile(value, form.getFieldValue('ideaFiles'));
                  },
                },
              ]}
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

        {/* 只在调研步露出；后续设定/结构/写作仍用同一份已落盘强度。 */}
        {showReasoningEffort && researchStep ? (
          <Form.Item label={REASONING_EFFORT_LABEL}>
            <Select
              value={reasoningValue}
              options={reasoningOptions.map((value) => ({
                value,
                label: REASONING_EFFORT_OPTION_LABEL[value],
              }))}
              onChange={(value: NovelReasoningEffort) => onReasoningEffortChange(value)}
            />
          </Form.Item>
        ) : null}
      </Form>
    </StudioControlPanel>
  );
}
