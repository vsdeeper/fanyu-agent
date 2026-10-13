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
  CAST_BUTTON,
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
  IDEA_PLACEHOLDER,
  PLAN_BUTTON,
  PLAN_FILE_HINT,
  PLAN_FILE_LABEL,
  PLAN_FILE_MAX,
  PLAN_FILE_SUBTITLE,
  REASONING_EFFORT_LABEL,
  REASONING_EFFORT_OPTION_LABEL,
  RESEARCH_BUTTON,
  SELECTED_TOPIC_EMPTY,
  SELECTED_TOPIC_LABEL,
  STYLE_LABEL,
  TENSE_LABEL,
  TENSE_OPTIONS,
} from '../constants';
import type {
  ChaptersSnapshot,
  NovelPanelValues,
  NovelPlan,
  NovelTense,
  StudioPhase,
  TopicCard,
} from '../types';
import WritingUnitList from './WritingUnitList';
import { isAllowedIdeaFile, requireSystemFiles } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<NovelPanelValues>;
  initialValues: NovelPanelValues;
  reasoningEffort: NovelReasoningEffort;
  onReasoningEffortChange: (next: NovelReasoningEffort) => void;
  phase: StudioPhase;
  selectedTopic?: TopicCard;
  plan?: NovelPlan;
  chapters?: ChaptersSnapshot;
  selectedUnitIds: string[];
  focusUnitId?: string;
  styleSelections: StyleDimensionSelections;
  tense?: NovelTense;
  writeBusy?: boolean;
  onResearch: () => void;
  onGeneratePlan: () => void;
  onGenerateCast: () => void;
  onToggleWritingUnit: (unitId: string) => void;
  onStyleSelectionsChange: (next: StyleDimensionSelections) => void;
  onTenseChange: (tense: NovelTense) => void;
};

/** 小说左栏：调研、方案、角色、卷章、写作共用一个 Form。 */
export default function ControlPanel({
  form,
  initialValues,
  reasoningEffort,
  onReasoningEffortChange,
  phase,
  selectedTopic,
  plan,
  chapters,
  selectedUnitIds,
  focusUnitId,
  styleSelections,
  tense,
  writeBusy = false,
  onResearch,
  onGeneratePlan,
  onGenerateCast,
  onToggleWritingUnit,
  onStyleSelectionsChange,
  onTenseChange,
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
  const planBusy = phase === 'planning';
  const castBusy = phase === 'casting';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planStep = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const castStep = phase === 'cast' || phase === 'casting' || phase === 'casted';
  const chaptersStep = phase === 'chapters' || phase === 'chaptering' || phase === 'chaptered';
  const writeStep = phase === 'write' || phase === 'writing' || phase === 'written';
  const showFooter = researchStep || planStep || castStep;
  const formDisabled =
    (researchStep && researchBusy) || (planStep && planBusy) || (writeStep && writeBusy);

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
            {planStep ? (
              <Button
                type="primary"
                block
                size="large"
                loading={planBusy}
                disabled={!selectedTopic}
                onClick={onGeneratePlan}
              >
                {PLAN_BUTTON}
              </Button>
            ) : null}
            {castStep ? (
              <Button
                type="primary"
                block
                size="large"
                loading={castBusy}
                disabled={!selectedTopic || !plan}
                onClick={onGenerateCast}
              >
                {CAST_BUTTON}
              </Button>
            ) : null}
          </>
        ) : undefined
      }
    >
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
              rules={[
                {
                  validator: async (_, value: NovelPanelValues['ideaFiles'] | undefined) => {
                    await requireSystemFiles(value);
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
                ariaLabel="上传体系设定"
                disabled={researchBusy}
              />
            </Form.Item>
            <Form.Item name="planFiles">
              <ProductDocsUpload
                max={PLAN_FILE_MAX}
                label={PLAN_FILE_LABEL}
                subtitle={PLAN_FILE_SUBTITLE}
                hint={PLAN_FILE_HINT}
                accept={IDEA_FILE_ACCEPT}
                typeWarning={IDEA_FILE_TYPE_WARNING}
                isAllowedFile={isAllowedIdeaFile}
                ariaLabel="上传创作方案"
                disabled={researchBusy}
              />
            </Form.Item>
            <Form.Item name="idea" label={IDEA_LABEL}>
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
          </>
        ) : null}

        {planStep || castStep || chaptersStep ? (
          <div className={styles.topicBlock}>
            <div className={styles.topicLabel}>{SELECTED_TOPIC_LABEL}</div>
            {selectedTopic ? (
              <TopicCardView topic={selectedTopic} />
            ) : (
              <p className={styles.topicEmpty}>{SELECTED_TOPIC_EMPTY}</p>
            )}
          </div>
        ) : null}

        {writeStep && plan ? (
          <>
            <div className={styles.styleRow}>
              <Form.Item label={STYLE_LABEL}>
                <StyleDimensionPicker
                  value={styleSelections}
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
            <Form.Item label={TENSE_LABEL}>
              <Select
                value={tense}
                options={TENSE_OPTIONS}
                placeholder={TENSE_LABEL}
                disabled={writeBusy}
                onChange={onTenseChange}
              />
            </Form.Item>
            <WritingUnitList
              plan={plan}
              chapters={chapters}
              selectedUnitIds={selectedUnitIds}
              focusUnitId={focusUnitId}
              onToggle={onToggleWritingUnit}
            />
          </>
        ) : null}

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
