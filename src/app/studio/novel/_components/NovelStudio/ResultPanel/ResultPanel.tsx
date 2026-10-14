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
  CHAPTERS_IMPORT_CONFIRM_CONTENT,
  CHAPTERS_IMPORT_CONFIRM_TITLE,
  CHAPTERS_PANEL_TITLE,
  EMPTY_CAST_HINT,
  EMPTY_CHAPTERS_HINT,
  EMPTY_PLAN_HINT,
  EMPTY_RESEARCH_HINT,
  EMPTY_VOLUMES_HINT,
  EMPTY_WRITE_HINT,
  EMPTY_WORLDVIEW_HINT,
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
  VOLUMES_EXPORT_BUTTON,
  VOLUMES_EXPORT_FILE_NAME,
  VOLUMES_EXPORT_MEDIA_TYPE,
  VOLUMES_GENERATING_HINT,
  VOLUMES_IMPORT_CONFIRM_CONTENT,
  VOLUMES_IMPORT_CONFIRM_TITLE,
  VOLUMES_PANEL_TITLE,
  WORLDVIEW_EXPORT_BUTTON,
  WORLDVIEW_EXPORT_FILE_NAME,
  WORLDVIEW_EXPORT_MEDIA_TYPE,
  WORLDVIEW_GENERATING_HINT,
  WORLDVIEW_IMPORT_CONFIRM_CONTENT,
  WORLDVIEW_IMPORT_CONFIRM_TITLE,
  WORLDVIEW_PANEL_TITLE,
  WRITE_PANEL_TITLE,
} from '../constants';
import {
  hasCastDraft,
  isCastReady,
  isPlanReady,
  isSelectedVolumeReady,
  isSelectedVolumeReadyForChapters,
  isWorldviewReady,
  selectedVolume,
  selectedVolumeChapters,
} from '../utils';
import TopicCardView from '../TopicCardView';
import type {
  CastStepSnapshot,
  ChaptersSnapshot,
  NovelPlan,
  NovelSection,
  NovelVolumeDesign,
  PlanStepSnapshot,
  StudioPhase,
  StructureChapter,
  TopicCard,
  VolumesStepSnapshot,
  WorldviewStepSnapshot,
  WritingSnapshot,
} from '../types';
import BibleEditor from './BibleEditor';
import RelationGraph from './BibleEditor/RelationGraph';
import { RELATION_GRAPH_MODAL_WIDTH } from './BibleEditor/RelationGraph/constants';
import { hasNamedCharacter } from './BibleEditor/RelationGraph/utils';
import MarkdownImportButton from './MarkdownImportButton';
import SectionEditor from './SectionEditor';
import VolumeChapters from './VolumeChapters';
import VolumeDesignEditor from './VolumeDesignEditor';
import WritingEditor from './WritingEditor';
import styles from './ResultPanel.module.css';
import {
  buildCastMarkdown,
  buildChaptersMarkdown,
  buildPlanMarkdown,
  buildVolumesMarkdown,
  buildWorldviewMarkdown,
  downloadMarkdown,
  parseCastMarkdownImport,
  parseChaptersMarkdownImport,
  parsePlanMarkdownImport,
  parseVolumesMarkdownImport,
  parseWorldviewMarkdownImport,
} from './utils';

type ResultPanelProps = {
  phase: StudioPhase;
  worldview?: WorldviewStepSnapshot;
  topics: TopicCard[];
  selectedTopicId?: string;
  plan?: PlanStepSnapshot;
  cast?: CastStepSnapshot;
  volumes?: VolumesStepSnapshot;
  chapters?: ChaptersSnapshot;
  writing?: WritingSnapshot;
  selectedUnitIds: string[];
  generatingUnitIds?: string[];
  polishingUnitId?: string;
  onSelectTopic: (id: string) => void;
  onUpdateTopic: (next: TopicCard) => void;
  onChangeWorldview: (next: NovelSection[]) => void;
  onImportWorldview: (next: WorldviewStepSnapshot) => Promise<boolean>;
  onChangePlan: (next: NovelPlan) => void;
  onImportPlan: (next: PlanStepSnapshot) => Promise<boolean>;
  onChangeCast: (next: CastStepSnapshot) => void;
  onImportCast: (next: CastStepSnapshot) => Promise<boolean>;
  onChangeVolumes: (next: NovelVolumeDesign[]) => void;
  onImportVolumes: (next: VolumesStepSnapshot) => Promise<boolean>;
  onSelectVolume: (volumeId: string) => void;
  onImportChapters: (next: ChaptersSnapshot) => Promise<boolean>;
  onPrev: () => void;
  onNext: () => void;
  onGenerateVolumeChapters: () => void;
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

/** 右侧结果区：世界观 / 选题 / 创作方案 / 角色 / 卷纲 / 卷章 / 正文。 */
export default function ResultPanel({
  phase,
  worldview,
  topics,
  selectedTopicId,
  plan,
  cast,
  volumes,
  chapters,
  writing,
  selectedUnitIds,
  generatingUnitIds = [],
  polishingUnitId,
  onSelectTopic,
  onUpdateTopic,
  onChangeWorldview,
  onImportWorldview,
  onChangePlan,
  onImportPlan,
  onChangeCast,
  onImportCast,
  onChangeVolumes,
  onImportVolumes,
  onSelectVolume,
  onImportChapters,
  onPrev,
  onNext,
  onGenerateVolumeChapters,
  onUpdateChapter,
  onRemoveChapter,
  onUpdateWritingBody,
  onGenerateWriting,
  onPolishWriting,
  onCopyWritingBody,
}: ResultPanelProps) {
  const worldviewView =
    phase === 'worldview' || phase === 'worldviewing' || phase === 'worldviewed';
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planView = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const castView = phase === 'cast' || phase === 'casting' || phase === 'casted';
  const volumesView = phase === 'volumes' || phase === 'voluming' || phase === 'volumed';
  const chaptersView = phase === 'chapters' || phase === 'chaptering' || phase === 'chaptered';
  const writeView = phase === 'write' || phase === 'writing' || phase === 'written';
  const worldviewing = phase === 'worldviewing';
  const researching = phase === 'researching';
  const researched = phase === 'researched';
  const planning = phase === 'planning';
  const casting = phase === 'casting';
  const voluming = phase === 'voluming';
  const chaptering = phase === 'chaptering';
  const worldviewEmpty = worldviewView && !worldviewing && !isWorldviewReady(worldview);
  const researchEmpty = researchView && !researching && topics.length === 0;
  const planEmpty = planView && !planning && !plan;
  const castEmpty = castView && !casting && !hasCastDraft(cast);
  const volumesEmpty = volumesView && !voluming && !(volumes?.volumes.length ?? 0);
  const activeVolume = selectedVolume(volumes);
  const chaptersEmpty = chaptersView && !activeVolume;

  const panelTitle = writeView
    ? WRITE_PANEL_TITLE
    : chaptersView
      ? CHAPTERS_PANEL_TITLE
      : volumesView
        ? VOLUMES_PANEL_TITLE
        : castView
          ? CAST_PANEL_TITLE
          : planView
            ? PLAN_PANEL_TITLE
            : researchView
              ? RESEARCH_PANEL_TITLE
              : WORLDVIEW_PANEL_TITLE;
  const writingLocked = Boolean(polishingUnitId) || generatingUnitIds.length > 0;
  const prevLocked =
    worldviewing || planning || casting || voluming || chaptering || (writeView && writingLocked);
  const [relationGraphOpen, setRelationGraphOpen] = useState(false);
  const [relationGraphPhase, setRelationGraphPhase] = useState(castView);
  if (relationGraphPhase !== castView) {
    setRelationGraphPhase(castView);
    if (!castView) setRelationGraphOpen(false);
  }
  const canPreviewRelations = Boolean(cast && hasNamedCharacter(cast.characters));
  const canPrev = researchView || planView || castView || volumesView || chaptersView || writeView;
  const canNext =
    (worldviewView && !worldviewing && isWorldviewReady(worldview)) ||
    (researched && Boolean(selectedTopicId)) ||
    (planView && !planning && isPlanReady(plan)) ||
    (castView && !casting && isCastReady(cast)) ||
    (volumesView && !voluming && isSelectedVolumeReadyForChapters(volumes)) ||
    (chaptersView && !chaptering && isSelectedVolumeReady(volumes, chapters));
  const stageFill =
    (worldviewView && (worldviewEmpty || (worldviewing && !worldview))) ||
    (researchView && (researchEmpty || (researching && topics.length === 0))) ||
    (planView && (planEmpty || (planning && !plan))) ||
    (castView && (castEmpty || casting)) ||
    (volumesView && (volumesEmpty || (voluming && !(volumes?.volumes.length ?? 0)))) ||
    (chaptersView && chaptersEmpty) ||
    (writeView && !(volumes && writing));

  return (
    <div className={styles.frame}>
      <StudioStagePanel
        variant={stageFill ? 'fill' : 'stream'}
        head={
          <>
            <StarOutlined />
            {panelTitle}
            {worldviewView ? (
              <div className={studioStageHeadActionsClassName}>
                <MarkdownImportButton
                  disabled={worldviewing}
                  confirmTitle={WORLDVIEW_IMPORT_CONFIRM_TITLE}
                  confirmContent={WORLDVIEW_IMPORT_CONFIRM_CONTENT}
                  parse={parseWorldviewMarkdownImport}
                  onImport={onImportWorldview}
                />
                <Button
                  size="small"
                  type="link"
                  disabled={worldviewing || !worldview || worldviewEmpty}
                  onClick={() =>
                    worldview &&
                    downloadMarkdown(
                      WORLDVIEW_EXPORT_FILE_NAME,
                      WORLDVIEW_EXPORT_MEDIA_TYPE,
                      buildWorldviewMarkdown(worldview),
                    )
                  }
                >
                  {WORLDVIEW_EXPORT_BUTTON}
                </Button>
              </div>
            ) : null}
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
            {volumesView ? (
              <div className={studioStageHeadActionsClassName}>
                <MarkdownImportButton
                  disabled={voluming}
                  confirmTitle={VOLUMES_IMPORT_CONFIRM_TITLE}
                  confirmContent={VOLUMES_IMPORT_CONFIRM_CONTENT}
                  parse={parseVolumesMarkdownImport}
                  onImport={onImportVolumes}
                />
                <Button
                  size="small"
                  type="link"
                  disabled={voluming || !volumes || volumesEmpty}
                  onClick={() =>
                    volumes &&
                    downloadMarkdown(
                      VOLUMES_EXPORT_FILE_NAME,
                      VOLUMES_EXPORT_MEDIA_TYPE,
                      buildVolumesMarkdown(volumes),
                    )
                  }
                >
                  {VOLUMES_EXPORT_BUTTON}
                </Button>
              </div>
            ) : null}
            {chaptersView ? (
              <div className={studioStageHeadActionsClassName}>
                <MarkdownImportButton
                  disabled={chaptering || !activeVolume}
                  confirmTitle={CHAPTERS_IMPORT_CONFIRM_TITLE}
                  confirmContent={CHAPTERS_IMPORT_CONFIRM_CONTENT}
                  parse={parseChaptersMarkdownImport}
                  onImport={onImportChapters}
                />
                <Button
                  size="small"
                  type="link"
                  disabled={chaptering || !chapters}
                  onClick={() =>
                    chapters &&
                    downloadMarkdown(
                      CHAPTERS_EXPORT_FILE_NAME,
                      CHAPTERS_EXPORT_MEDIA_TYPE,
                      buildChaptersMarkdown(volumes, chapters),
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
            {writeView ? null : (
              <Button type="primary" disabled={!canNext || writingLocked} onClick={onNext}>
                {NEXT_BUTTON}
              </Button>
            )}
          </>
        }
      >
        {worldviewView ? (
          worldviewing && !isWorldviewReady(worldview) ? (
            <div className={styles.body}>
              <Spin />
              <p className={styles.hint}>{WORLDVIEW_GENERATING_HINT}</p>
            </div>
          ) : worldviewEmpty ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_WORLDVIEW_HINT}</p>
            </div>
          ) : worldview ? (
            <div className={styles.scrollContent}>
              <SectionEditor sections={worldview.sections} onChange={onChangeWorldview} />
            </div>
          ) : null
        ) : null}

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
              <SectionEditor
                sections={plan.sections}
                onChange={(sections) => onChangePlan({ ...plan, sections })}
              />
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

        {volumesView ? (
          voluming && !(volumes?.volumes.length ?? 0) ? (
            <div className={styles.body}>
              <Spin />
              <p className={styles.hint}>{VOLUMES_GENERATING_HINT}</p>
            </div>
          ) : volumesEmpty ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_VOLUMES_HINT}</p>
            </div>
          ) : volumes ? (
            <div className={styles.scrollContent}>
              <VolumeDesignEditor
                volumes={volumes.volumes}
                characters={cast?.characters ?? []}
                selectedVolumeId={volumes.selectedVolumeId}
                onSelectVolume={onSelectVolume}
                onChange={onChangeVolumes}
              />
            </div>
          ) : null
        ) : null}

        {chaptersView ? (
          !activeVolume ? (
            <div className={styles.body}>
              <p className={styles.hint}>{EMPTY_CHAPTERS_HINT}</p>
            </div>
          ) : (
            <div className={styles.scrollContent}>
              <VolumeChapters
                volume={activeVolume}
                characters={cast?.characters ?? []}
                chapters={selectedVolumeChapters(volumes, chapters)}
                generating={chaptering}
                onGenerateChapters={onGenerateVolumeChapters}
                onChangeChapter={onUpdateChapter}
                onRemoveChapter={onRemoveChapter}
              />
            </div>
          )
        ) : null}

        {writeView ? (
          volumes && writing ? (
            <div className={styles.scrollContent}>
              <WritingEditor
                volumes={volumes}
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
