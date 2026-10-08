import StudioStagePanel from '@/app/studio/_components/StudioStagePanel';
import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import { useEffect, useRef } from 'react';
import {
  BEATS_TITLE,
  BIBLE_GENERATING_HINT,
  BIBLE_PANEL_TITLE,
  CHAPTERS_TITLE,
  EMPTY_BIBLE_HINT,
  EMPTY_RESEARCH_HINT,
  EMPTY_STRUCTURE_HINT,
  NEXT_BUTTON,
  PREV_BUTTON,
  RESEARCH_GENERATING_HINT,
  RESEARCH_PANEL_TITLE,
  RESEARCH_TOPICS_TITLE,
  STRUCTURE_GENERATING_HINT,
  STRUCTURE_PANEL_TITLE,
  SYNOPSIS_TITLE,
  VOLUMES_TITLE,
  WRITE_PANEL_TITLE,
} from '../constants';
import { hasBibleDraft, isBibleReadyForStructure } from '../utils';
import TopicCardView from '../TopicCardView';
import type {
  BibleStepSnapshot,
  StructureSnapshot,
  StudioPhase,
  TopicCard,
  WritingSnapshot,
} from '../types';
import BeatList from './BeatList';
import BibleEditor from './BibleEditor';
import ChapterList from './ChapterList';
import VolumeList from './VolumeList';
import WritingEditor from './WritingEditor';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  topics: TopicCard[];
  selectedTopicId?: string;
  bible?: BibleStepSnapshot;
  /** 生成设定时已到达的说明；末尾 JSON 未闭合前会被去掉。 */
  bibleStream?: string;
  structure?: StructureSnapshot;
  writing?: WritingSnapshot;
  selectedUnitIds: string[];
  generatingChapterId?: string;
  generatingVolumeId?: string;
  generatingUnitIds?: string[];
  polishingUnitId?: string;
  onSelectTopic: (id: string) => void;
  onChangeBible: (next: BibleStepSnapshot) => void;
  onPrev: () => void;
  onNext: () => void;
  onUpdateSynopsis: (synopsis: string) => void;
  onUpdateBeat: (beatId: string, text: string) => void;
  onRemoveBeat: (beatId: string) => void;
  onUpdateVolume: (volumeId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveVolume: (volumeId: string) => void;
  onGenerateVolumeChapters: (volumeId: string) => void;
  onUpdateChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
  onGenerateChapterBeats: (chapterId: string) => void;
  onUpdateChapterBeat: (chapterId: string, beatId: string, text: string) => void;
  onRemoveChapterBeat: (chapterId: string, beatId: string) => void;
  onUpdateWritingBody: (unitId: string, body: string) => void;
  onGenerateWriting: (unitIds: string[]) => void;
  onPolishWriting: (unitId: string) => void;
};

/** 右侧结果区：选题卡 / 设定 / 故事结构 / 正文写作。 */
export default function ResultPanel({
  phase,
  topics,
  selectedTopicId,
  bible,
  bibleStream = '',
  structure,
  writing,
  selectedUnitIds,
  generatingChapterId,
  generatingVolumeId,
  generatingUnitIds = [],
  polishingUnitId,
  onSelectTopic,
  onChangeBible,
  onPrev,
  onNext,
  onUpdateSynopsis,
  onUpdateBeat,
  onRemoveBeat,
  onUpdateVolume,
  onRemoveVolume,
  onGenerateVolumeChapters,
  onUpdateChapter,
  onRemoveChapter,
  onGenerateChapterBeats,
  onUpdateChapterBeat,
  onRemoveChapterBeat,
  onUpdateWritingBody,
  onGenerateWriting,
  onPolishWriting,
}: ResultPanelProps) {
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const bibleView = phase === 'bible' || phase === 'bibling' || phase === 'bibled';
  const structureView = phase === 'structure' || phase === 'structuring' || phase === 'structured';
  const writeView = phase === 'write' || phase === 'writing' || phase === 'written';
  const researching = phase === 'researching';
  const researched = phase === 'researched';
  const bibling = phase === 'bibling';
  const bibleStreamText = bibleStream.trim();
  const streamRef = useRef<HTMLDivElement>(null);
  const structuring = phase === 'structuring';
  const researchEmpty = researchView && !researching && topics.length === 0;
  const bibleEmpty = bibleView && !bibling && !hasBibleDraft(bible);
  const structureEmpty = structureView && !structuring && !structure;

  useEffect(() => {
    if (!bibling || !bibleStreamText) return;
    const scroller = streamRef.current?.parentElement;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [bibleStreamText, bibling]);

  const panelTitle = writeView
    ? WRITE_PANEL_TITLE
    : structureView
      ? STRUCTURE_PANEL_TITLE
      : bibleView
        ? BIBLE_PANEL_TITLE
        : RESEARCH_PANEL_TITLE;
  const writingLocked = Boolean(polishingUnitId) || generatingUnitIds.length > 0;
  const canPrev = bibleView || structureView || writeView;
  const canNext =
    (researched && Boolean(selectedTopicId)) ||
    (bibleView && !bibling && isBibleReadyForStructure(bible)) ||
    structureView ||
    writeView;
  const stageFill =
    (researchView && (researchEmpty || (researching && topics.length === 0))) ||
    (bibleView && (bibleEmpty || (bibling && !bibleStreamText))) ||
    (structureView && !structure) ||
    (writeView && !(structure && writing));

  return (
    <StudioStagePanel
      variant={stageFill ? 'fill' : 'stream'}
      head={
        <>
          <StarOutlined />
          {panelTitle}
        </>
      }
      footer={
        <>
          {canPrev ? (
            <Button disabled={writingLocked} onClick={onPrev}>
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
                />
              ))}
            </div>
          </div>
        )
      ) : null}

      {bibleView ? (
        bibling ? (
          bibleStreamText ? (
            <div ref={streamRef}>
              <p className={styles.streamText}>{bibleStreamText}</p>
              <div className={styles.streamStatus}>
                <Spin size="small" />
                <span>{BIBLE_GENERATING_HINT}</span>
              </div>
            </div>
          ) : (
            <div className={styles.body}>
              <Spin />
              <p className={styles.hint}>{BIBLE_GENERATING_HINT}</p>
            </div>
          )
        ) : bibleEmpty ? (
          <div className={styles.body}>
            <p className={styles.hint}>{EMPTY_BIBLE_HINT}</p>
          </div>
        ) : bible ? (
          <div className={styles.scrollContent}>
            <BibleEditor bible={bible} onChange={onChangeBible} />
          </div>
        ) : null
      ) : null}

      {structureView ? (
        structureEmpty ? (
          <div className={styles.body}>
            <p className={styles.hint}>{EMPTY_STRUCTURE_HINT}</p>
          </div>
        ) : structuring && !structure ? (
          <div className={styles.body}>
            <Spin />
            <p className={styles.hint}>{STRUCTURE_GENERATING_HINT}</p>
          </div>
        ) : structure ? (
          <div className={styles.scrollContent}>
            {structure.kind === 'short' ? (
              <>
                <div className={styles.synopsisBlock}>
                  <p className={styles.sectionTitle}>{SYNOPSIS_TITLE}</p>
                  <Input.TextArea
                    value={structure.synopsis}
                    autoSize={{ minRows: 2, maxRows: 6 }}
                    onChange={(event) => onUpdateSynopsis(event.target.value)}
                  />
                </div>
                <BeatList
                  beats={structure.beats}
                  title={BEATS_TITLE}
                  onChangeBeat={onUpdateBeat}
                  onRemoveBeat={onRemoveBeat}
                />
              </>
            ) : structure.kind === 'volumes' ? (
              <VolumeList
                volumes={structure.volumes}
                title={VOLUMES_TITLE}
                generatingVolumeId={generatingVolumeId}
                generatingChapterId={generatingChapterId}
                onChangeVolume={onUpdateVolume}
                onRemoveVolume={onRemoveVolume}
                onGenerateVolumeChapters={onGenerateVolumeChapters}
                onChangeChapter={onUpdateChapter}
                onRemoveChapter={onRemoveChapter}
                onGenerateChapterBeats={onGenerateChapterBeats}
                onChangeChapterBeat={onUpdateChapterBeat}
                onRemoveChapterBeat={onRemoveChapterBeat}
              />
            ) : (
              <ChapterList
                chapters={structure.chapters}
                title={CHAPTERS_TITLE}
                generatingChapterId={generatingChapterId}
                onChangeChapter={onUpdateChapter}
                onRemoveChapter={onRemoveChapter}
                onGenerateChapterBeats={onGenerateChapterBeats}
                onChangeChapterBeat={onUpdateChapterBeat}
                onRemoveChapterBeat={onRemoveChapterBeat}
              />
            )}
          </div>
        ) : null
      ) : null}

      {writeView ? (
        structure && writing ? (
          <div className={styles.scrollContent}>
            <WritingEditor
              structure={structure}
              writing={writing}
              selectedUnitIds={selectedUnitIds}
              generatingUnitIds={generatingUnitIds}
              polishingUnitId={polishingUnitId}
              onSaveBody={onUpdateWritingBody}
              onGenerateWriting={onGenerateWriting}
              onPolishWriting={onPolishWriting}
            />
          </div>
        ) : (
          <div className={styles.body}>
            <p className={styles.hint}>{EMPTY_STRUCTURE_HINT}</p>
          </div>
        )
      ) : null}
    </StudioStagePanel>
  );
}
