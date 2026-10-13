import StudioStagePanel, {
  studioStageHeadActionsClassName,
} from '@/app/studio/_components/StudioStagePanel';
import { StarOutlined } from '@ant-design/icons';
import { Button, Modal, Spin } from 'antd';
import { useState } from 'react';
import {
  CAST_EXPORT_BUTTON,
  CAST_EXPORT_FILE_NAME,
  CAST_EXPORT_MEDIA_TYPE,
  CAST_GENERATING_HINT,
  CAST_IMPORT_CONFIRM_CONTENT,
  CAST_IMPORT_CONFIRM_TITLE,
  CAST_PANEL_TITLE,
  CHAPTERS_EXPORT_BUTTON,
  CHAPTERS_EXPORT_FILE_NAME,
  CHAPTERS_EXPORT_MEDIA_TYPE,
  CHAPTERS_GENERATING_HINT,
  CHAPTERS_IMPORT_CONFIRM_CONTENT,
  CHAPTERS_IMPORT_CONFIRM_TITLE,
  CHAPTERS_PANEL_TITLE,
  EMPTY_CAST_HINT,
  EMPTY_CHAPTERS_HINT,
  EMPTY_PLAN_HINT,
  EMPTY_RESEARCH_HINT,
  EMPTY_WRITE_HINT,
  NEXT_BUTTON,
  PLAN_EXPORT_BUTTON,
  PLAN_EXPORT_FILE_NAME,
  PLAN_EXPORT_MEDIA_TYPE,
  PLAN_GENERATING_HINT,
  PLAN_IMPORT_CONFIRM_CONTENT,
  PLAN_IMPORT_CONFIRM_TITLE,
  PLAN_PANEL_TITLE,
  PREV_BUTTON,
  PREVIEW_RELATION_GRAPH_BUTTON,
  RESEARCH_GENERATING_HINT,
  RESEARCH_PANEL_TITLE,
  RESEARCH_TOPICS_TITLE,
  WRITE_PANEL_TITLE,
} from '../constants';
import { hasCastDraft, isCastReady, isPlanReady, isSelectedVolumeReadyForWrite } from '../utils';
import TopicCardView from '../TopicCardView';
import type {
  CastStepSnapshot,
  ChaptersSnapshot,
  NovelPlan,
  PlanStepSnapshot,
  StudioPhase,
  StructureChapter,
  TopicCard,
  WritingSnapshot,
} from '../types';
import BibleEditor from './BibleEditor';
import RelationGraph from './BibleEditor/RelationGraph';
import { RELATION_GRAPH_MODAL_WIDTH } from './BibleEditor/RelationGraph/constants';
import { hasNamedCharacter } from './BibleEditor/RelationGraph/utils';
import MarkdownImportButton from './MarkdownImportButton';
import PlanEditor from './PlanEditor';
import VolumeList from './VolumeList';
import WritingEditor from './WritingEditor';
import styles from './ResultPanel.module.css';
import {
  buildCastMarkdown,
  buildChaptersMarkdown,
  buildPlanMarkdown,
  downloadMarkdown,
  parseCastMarkdownImport,
  parseChaptersMarkdownImport,
  parsePlanMarkdownImport,
} from './utils';

type ResultPanelProps = {
  phase: StudioPhase;
  topics: TopicCard[];
  selectedTopicId?: string;
  plan?: PlanStepSnapshot;
  cast?: CastStepSnapshot;
  chapters?: ChaptersSnapshot;
  selectedVolumeId?: string;
  writing?: WritingSnapshot;
  selectedUnitIds: string[];
  generatingVolumeId?: string;
  generatingUnitIds?: string[];
  polishingUnitId?: string;
  onSelectTopic: (id: string) => void;
  onUpdateTopic: (next: TopicCard) => void;
  onChangePlan: (next: NovelPlan) => void;
  onImportPlan: (next: PlanStepSnapshot) => Promise<boolean>;
  onChangeCast: (next: CastStepSnapshot) => void;
  onImportCast: (next: CastStepSnapshot) => Promise<boolean>;
  onImportChapters: (next: ChaptersSnapshot) => Promise<boolean>;
  onPrev: () => void;
  onNext: () => void;
  onSelectVolume: (volumeId: string) => void;
  onGenerateVolumeChapters: (volumeId: string) => void;
  onUpdateChapter: (
    chapterId: string,
    patch: Partial<Pick<StructureChapter, 'title' | 'scene' | 'event' | 'hook'>>,
  ) => void;
  onRemoveChapter: (chapterId: string) => void;
  onUpdateWritingBody: (unitId: string, body: string) => void;
  onGenerateWriting: (unitIds: string[]) => void;
  onPolishWriting: (unitId: string) => void;
  onCopyWritingBody: (unitId: string) => void;
};

/** 右侧结果区：选题 / 创作方案 / 角色 / 卷章 / 正文。 */
export default function ResultPanel({
  phase,
  topics,
  selectedTopicId,
  plan,
  cast,
  chapters,
  selectedVolumeId,
  writing,
  selectedUnitIds,
  generatingVolumeId,
  generatingUnitIds = [],
  polishingUnitId,
  onSelectTopic,
  onUpdateTopic,
  onChangePlan,
  onImportPlan,
  onChangeCast,
  onImportCast,
  onImportChapters,
  onPrev,
  onNext,
  onSelectVolume,
  onGenerateVolumeChapters,
  onUpdateChapter,
  onRemoveChapter,
  onUpdateWritingBody,
  onGenerateWriting,
  onPolishWriting,
  onCopyWritingBody,
}: ResultPanelProps) {
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planView = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const castView = phase === 'cast' || phase === 'casting' || phase === 'casted';
  const chaptersView = phase === 'chapters' || phase === 'chaptering' || phase === 'chaptered';
  const writeView = phase === 'write' || phase === 'writing' || phase === 'written';
  const researching = phase === 'researching';
  const researched = phase === 'researched';
  const planning = phase === 'planning';
  const casting = phase === 'casting';
  const chaptering = phase === 'chaptering';
  const researchEmpty = researchView && !researching && topics.length === 0;
  const planEmpty = planView && !planning && !plan;
  const castEmpty = castView && !casting && !hasCastDraft(cast);
  const chaptersEmpty = chaptersView && !plan;

  const panelTitle = writeView
    ? WRITE_PANEL_TITLE
    : chaptersView
      ? CHAPTERS_PANEL_TITLE
      : castView
        ? CAST_PANEL_TITLE
        : planView
          ? PLAN_PANEL_TITLE
          : RESEARCH_PANEL_TITLE;
  const writingLocked = Boolean(polishingUnitId) || generatingUnitIds.length > 0;
  const prevLocked = planning || casting || chaptering || (writeView && writingLocked);
  const [relationGraphOpen, setRelationGraphOpen] = useState(false);
  const [relationGraphPhase, setRelationGraphPhase] = useState(castView);
  if (relationGraphPhase !== castView) {
    setRelationGraphPhase(castView);
    if (!castView) setRelationGraphOpen(false);
  }
  const canPreviewRelations = Boolean(cast && hasNamedCharacter(cast.characters));
  const canPrev = planView || castView || chaptersView || writeView;
  const canNext =
    (researched && Boolean(selectedTopicId)) ||
    (planView && !planning && isPlanReady(plan)) ||
    (castView && !casting && isCastReady(cast)) ||
    (chaptersView &&
      !chaptering &&
      isSelectedVolumeReadyForWrite(
        plan,
        chapters ? { ...chapters, ...(selectedVolumeId ? { selectedVolumeId } : {}) } : chapters,
      )) ||
    writeView;
  const stageFill =
    (researchView && (researchEmpty || (researching && topics.length === 0))) ||
    (planView && (planEmpty || (planning && !plan))) ||
    (castView && (castEmpty || casting)) ||
    (chaptersView && chaptersEmpty) ||
    (writeView && !(plan && writing));

  return (
    <div className={styles.frame}>
      <StudioStagePanel
        variant={stageFill ? 'fill' : 'stream'}
        head={
          <>
            <StarOutlined />
            {panelTitle}
            {planView ? (
              <div className={studioStageHeadActionsClassName}>
                <MarkdownImportButton
                  disabled={planning}
                  confirmTitle={PLAN_IMPORT_CONFIRM_TITLE}
                  confirmContent={PLAN_IMPORT_CONFIRM_CONTENT}
                  parse={parsePlanMarkdownImport}
                  onImport={onImportPlan}
                />
                <Button
                  size="small"
                  type="link"
                  disabled={planning || !plan}
                  onClick={() =>
                    plan &&
                    downloadMarkdown(
                      PLAN_EXPORT_FILE_NAME,
                      PLAN_EXPORT_MEDIA_TYPE,
                      buildPlanMarkdown(plan),
                    )
                  }
                >
                  {PLAN_EXPORT_BUTTON}
                </Button>
              </div>
            ) : null}
            {castView ? (
              <div className={studioStageHeadActionsClassName}>
                <MarkdownImportButton
                  disabled={casting}
                  confirmTitle={CAST_IMPORT_CONFIRM_TITLE}
                  confirmContent={CAST_IMPORT_CONFIRM_CONTENT}
                  parse={parseCastMarkdownImport}
                  onImport={onImportCast}
                />
                <Button
                  size="small"
                  type="link"
                  disabled={casting || !cast || castEmpty}
                  onClick={() =>
                    cast &&
                    downloadMarkdown(
                      CAST_EXPORT_FILE_NAME,
                      CAST_EXPORT_MEDIA_TYPE,
                      buildCastMarkdown(cast),
                    )
                  }
                >
                  {CAST_EXPORT_BUTTON}
                </Button>
              </div>
            ) : null}
            {chaptersView ? (
              <div className={studioStageHeadActionsClassName}>
                <MarkdownImportButton
                  disabled={chaptering || !plan}
                  confirmTitle={CHAPTERS_IMPORT_CONFIRM_TITLE}
                  confirmContent={CHAPTERS_IMPORT_CONFIRM_CONTENT}
                  parse={parseChaptersMarkdownImport}
                  onImport={onImportChapters}
                />
                <Button
                  size="small"
                  type="link"
                  disabled={chaptering || !plan || !chapters}
                  onClick={() =>
                    plan &&
                    chapters &&
                    downloadMarkdown(
                      CHAPTERS_EXPORT_FILE_NAME,
                      CHAPTERS_EXPORT_MEDIA_TYPE,
                      buildChaptersMarkdown(plan, chapters),
                    )
                  }
                >
                  {CHAPTERS_EXPORT_BUTTON}
                </Button>
              </div>
            ) : null}
          </>
        }
        footer={
          <>
            {castView ? (
              <Button
                disabled={casting || !canPreviewRelations}
                onClick={() => setRelationGraphOpen(true)}
              >
                {PREVIEW_RELATION_GRAPH_BUTTON}
              </Button>
            ) : null}
            {canPrev ? (
              <Button disabled={prevLocked} onClick={onPrev}>
                {PREV_BUTTON}
              </Button>
            ) : null}
            <Button type="primary" disabled={!canNext || writingLocked} onClick={onNext}>
              {NEXT_BUTTON}
            </Button>
          </>
        }
      >
        {researchView ? (
          researchEmpty ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_RESEARCH_HINT}</p>
            </div>
          ) : researching && topics.length === 0 ? (
            <div className={styles.body}>
              <Spin />
              <p className={styles.hint}>{RESEARCH_GENERATING_HINT}</p>
            </div>
          ) : (
            <div className={styles.scrollContent}>
              <p className={styles.sectionTitle}>{RESEARCH_TOPICS_TITLE}</p>
              <div className={styles.topicList}>
                {topics.map((topic) => (
                  <TopicCardView
                    key={topic.id}
                    topic={topic}
                    selected={topic.id === selectedTopicId}
                    onSelect={() => onSelectTopic(topic.id)}
                    onSave={onUpdateTopic}
                  />
                ))}
              </div>
            </div>
          )
        ) : null}

        {planView ? (
          planning && !plan ? (
            <div className={styles.body}>
              <Spin />
              <p className={styles.hint}>{PLAN_GENERATING_HINT}</p>
            </div>
          ) : planEmpty ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_PLAN_HINT}</p>
            </div>
          ) : plan ? (
            <div className={styles.scrollContent}>
              <PlanEditor plan={plan} onChange={onChangePlan} />
            </div>
          ) : null
        ) : null}

        {castView ? (
          casting ? (
            <div className={styles.body}>
              <Spin />
              <p className={styles.hint}>{CAST_GENERATING_HINT}</p>
            </div>
          ) : castEmpty ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_CAST_HINT}</p>
            </div>
          ) : cast ? (
            <div className={styles.scrollContent}>
              <BibleEditor bible={cast} onChange={onChangeCast} />
            </div>
          ) : null
        ) : null}

        {chaptersView ? (
          !plan ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_CHAPTERS_HINT}</p>
            </div>
          ) : (
            <div className={styles.scrollContent}>
              {chaptering && !chapters ? (
                <div className={styles.body}>
                  <Spin />
                  <p className={styles.hint}>{CHAPTERS_GENERATING_HINT}</p>
                </div>
              ) : null}
              <VolumeList
                plan={plan}
                chapters={chapters}
                generatingVolumeId={generatingVolumeId}
                selectedVolumeId={selectedVolumeId}
                onSelectVolume={onSelectVolume}
                onGenerateChapters={onGenerateVolumeChapters}
                onChangeChapter={onUpdateChapter}
                onRemoveChapter={onRemoveChapter}
              />
            </div>
          )
        ) : null}

        {writeView ? (
          plan && writing ? (
            <div className={styles.scrollContent}>
              <WritingEditor
                plan={plan}
                chapters={chapters}
                writing={writing}
                selectedUnitIds={selectedUnitIds}
                generatingUnitIds={generatingUnitIds}
                polishingUnitId={polishingUnitId}
                onSaveBody={onUpdateWritingBody}
                onGenerateWriting={onGenerateWriting}
                onPolishWriting={onPolishWriting}
                onCopyWritingBody={onCopyWritingBody}
              />
            </div>
          ) : (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_WRITE_HINT}</p>
            </div>
          )
        ) : null}
      </StudioStagePanel>
      {cast && castView ? (
        <Modal
          title={PREVIEW_RELATION_GRAPH_BUTTON}
          open={relationGraphOpen}
          width={RELATION_GRAPH_MODAL_WIDTH}
          footer={null}
          destroyOnHidden
          onCancel={() => setRelationGraphOpen(false)}
        >
          <RelationGraph bible={cast} />
        </Modal>
      ) : null}
    </div>
  );
}
