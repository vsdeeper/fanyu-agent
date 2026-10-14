import { useEffect } from 'react';
import { Button, Form, Select, type FormInstance } from 'antd';
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
  VOLUMES_BUTTON,
  GENRE_LABEL,
  GENRE_OPTIONS,
  GENRE_PLACEHOLDER,
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
  WORLDVIEW_BUTTON,
  WORLDVIEW_FILE_ACCEPT,
  WORLDVIEW_FILE_HINT,
  WORLDVIEW_FILE_LABEL,
  WORLDVIEW_FILE_MAX,
  WORLDVIEW_FILE_SUBTITLE,
  WORLDVIEW_FILE_TYPE_WARNING,
} from '../constants';
import type {
  CastStepSnapshot,
  ChaptersSnapshot,
  NovelPanelValues,
  NovelPlan,
  StudioPhase,
  TopicCard,
  VolumesStepSnapshot,
} from '../types';
import WritingUnitList from './WritingUnitList';
import { isAllowedIdeaFile, requireWorldviewFiles } from './utils';
import styles from './ControlPanel.module.css';

type ControlPanelProps = {
  form: FormInstance<NovelPanelValues>;
  initialValues: NovelPanelValues;
  reasoningEffort: NovelReasoningEffort;
  onReasoningEffortChange: (next: NovelReasoningEffort) => void;
  phase: StudioPhase;
  selectedTopic?: TopicCard;
  plan?: NovelPlan;
  cast?: CastStepSnapshot;
  volumes?: VolumesStepSnapshot;
  chapters?: ChaptersSnapshot;
  selectedUnitIds: string[];
  focusUnitId?: string;
  styleSelections: StyleDimensionSelections;
  writeBusy?: boolean;
  onGenerateWorldview: () => void;
  onResearch: () => void;
  onGeneratePlan: () => void;
  onGenerateCast: () => void;
  onGenerateVolumes: () => void;
  onToggleWritingUnit: (unitId: string) => void;
  onStyleSelectionsChange: (next: StyleDimensionSelections) => void;
};

/** 小说左栏：世界观、选题、方案、角色、卷章、写作共用一个 Form。 */
export default function ControlPanel({
  form,
  initialValues,
  reasoningEffort,
  onReasoningEffortChange,
  phase,
  selectedTopic,
  plan,
  cast,
  volumes,
  chapters,
  selectedUnitIds,
  focusUnitId,
  styleSelections,
  writeBusy = false,
  onGenerateWorldview,
  onResearch,
  onGeneratePlan,
  onGenerateCast,
  onGenerateVolumes,
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

  const worldviewBusy = phase === 'worldviewing';
  const researchBusy = phase === 'researching';
  const planBusy = phase === 'planning';
  const castBusy = phase === 'casting';
  const volumesBusy = phase === 'voluming';
  const worldviewStep =
    phase === 'worldview' || phase === 'worldviewing' || phase === 'worldviewed';
  const researchStep = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planStep = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const castStep = phase === 'cast' || phase === 'casting' || phase === 'casted';
  const volumesStep = phase === 'volumes' || phase === 'voluming' || phase === 'volumed';
  const chaptersStep = phase === 'chapters' || phase === 'chaptering' || phase === 'chaptered';
  const writeStep = phase === 'write' || phase === 'writing' || phase === 'written';
  const showFooter = worldviewStep || researchStep || planStep || castStep || volumesStep;
  const formDisabled =
    (worldviewStep && worldviewBusy) ||
    (researchStep && researchBusy) ||
    (planStep && planBusy) ||
    (writeStep && writeBusy);

  return (
    <StudioControlPanel
      footer={
        showFooter ? (
          <>
            {worldviewStep ? (
              <Button
                type="primary"
                block
                size="large"
                loading={worldviewBusy}
                onClick={onGenerateWorldview}
              >
                {WORLDVIEW_BUTTON}
              </Button>
            ) : null}
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
            {volumesStep ? (
              <Button
                type="primary"
                block
                size="large"
                loading={volumesBusy}
                disabled={!selectedTopic || !cast}
                onClick={onGenerateVolumes}
              >
                {VOLUMES_BUTTON}
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
        {worldviewStep ? (
          <Form.Item
            name="worldviewFiles"
            rules={[
              {
                validator: async (_, value: NovelPanelValues['worldviewFiles'] | undefined) => {
                  await requireWorldviewFiles(value);
                },
              },
            ]}
          >
            <ProductDocsUpload
              max={WORLDVIEW_FILE_MAX}
              label={WORLDVIEW_FILE_LABEL}
              subtitle={WORLDVIEW_FILE_SUBTITLE}
              hint={WORLDVIEW_FILE_HINT}
              accept={WORLDVIEW_FILE_ACCEPT}
              typeWarning={WORLDVIEW_FILE_TYPE_WARNING}
              isAllowedFile={isAllowedIdeaFile}
              ariaLabel="上传世界观设定"
              disabled={worldviewBusy}
            />
          </Form.Item>
        ) : null}

        {researchStep ? (
          <>
            <Form.Item name="planFiles">
              <ProductDocsUpload
                max={PLAN_FILE_MAX}
                label={PLAN_FILE_LABEL}
                subtitle={PLAN_FILE_SUBTITLE}
                hint={PLAN_FILE_HINT}
                accept={WORLDVIEW_FILE_ACCEPT}
                typeWarning={WORLDVIEW_FILE_TYPE_WARNING}
                isAllowedFile={isAllowedIdeaFile}
                ariaLabel="上传创作方案"
                disabled={researchBusy}
              />
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

        {planStep || castStep || volumesStep || chaptersStep ? (
          <div className={styles.topicBlock}>
            <div className={styles.topicLabel}>{SELECTED_TOPIC_LABEL}</div>
            {selectedTopic ? (
              <TopicCardView topic={selectedTopic} />
            ) : (
              <p className={styles.topicEmpty}>{SELECTED_TOPIC_EMPTY}</p>
            )}
          </div>
        ) : null}

        {writeStep && volumes ? (
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
            <WritingUnitList
              volumes={volumes}
              chapters={chapters}
              selectedUnitIds={selectedUnitIds}
              focusUnitId={focusUnitId}
              onToggle={onToggleWritingUnit}
            />
          </>
        ) : null}

        {showReasoningEffort && worldviewStep ? (
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
