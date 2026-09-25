import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import {
  BEATS_TITLE,
  CHAPTERS_TITLE,
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
  WRITE_PANEL_TITLE,
} from '../constants';
import TopicCardView from '../TopicCardView';
import type { StructureSnapshot, StudioPhase, TopicCard, WritingSnapshot } from '../types';
import BeatList from './BeatList';
import ChapterList from './ChapterList';
import WritingEditor from './WritingEditor';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  topics: TopicCard[];
  selectedTopicId?: string;
  structure?: StructureSnapshot;
  writing?: WritingSnapshot;
  selectedUnitIds: string[];
  generatingChapterId?: string;
  onSelectTopic: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onUpdateSynopsis: (synopsis: string) => void;
  onUpdateBeat: (beatId: string, text: string) => void;
  onRemoveBeat: (beatId: string) => void;
  onUpdateChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
  onGenerateChapterBeats: (chapterId: string) => void;
  onUpdateChapterBeat: (chapterId: string, beatId: string, text: string) => void;
  onRemoveChapterBeat: (chapterId: string, beatId: string) => void;
  onUpdateWritingBody: (unitId: string, body: string) => void;
  onGenerateWriting: (unitIds: string[]) => void;
};

/** 右侧结果区：选题卡 / 故事结构 / 正文写作。 */
export default function ResultPanel({
  phase,
  topics,
  selectedTopicId,
  structure,
  writing,
  selectedUnitIds,
  generatingChapterId,
  onSelectTopic,
  onPrev,
  onNext,
  onUpdateSynopsis,
  onUpdateBeat,
  onRemoveBeat,
  onUpdateChapter,
  onRemoveChapter,
  onGenerateChapterBeats,
  onUpdateChapterBeat,
  onRemoveChapterBeat,
  onUpdateWritingBody,
  onGenerateWriting,
}: ResultPanelProps) {
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const structureView = phase === 'structure' || phase === 'structuring' || phase === 'structured';
  const writeView = phase === 'write' || phase === 'writing' || phase === 'written';
  const researching = phase === 'researching';
  const researched = phase === 'researched';
  const structuring = phase === 'structuring';
  const writingBusy = phase === 'writing';
  const researchEmpty = researchView && !researching && topics.length === 0;
  const structureEmpty = structureView && !structuring && !structure;

  const panelTitle = writeView
    ? WRITE_PANEL_TITLE
    : structureView
      ? STRUCTURE_PANEL_TITLE
      : RESEARCH_PANEL_TITLE;
  const canPrev = structureView || writeView;
  const canNext = (researched && Boolean(selectedTopicId)) || structureView || writeView;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined />
        {panelTitle}
      </div>

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
          <div className={styles.scroll}>
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
          </div>
        )
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
          <div className={styles.scroll}>
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
          </div>
        ) : null
      ) : null}

      {writeView ? (
        structure && writing ? (
          <div className={styles.scroll}>
            <div className={styles.scrollContent}>
              <WritingEditor
                structure={structure}
                writing={writing}
                selectedUnitIds={selectedUnitIds}
                generating={writingBusy}
                onSaveBody={onUpdateWritingBody}
                onGenerateWriting={onGenerateWriting}
              />
            </div>
          </div>
        ) : (
          <div className={styles.body}>
            <p className={styles.hint}>{EMPTY_STRUCTURE_HINT}</p>
          </div>
        )
      ) : null}

      <div className={styles.footer}>
        {canPrev ? <Button onClick={onPrev}>{PREV_BUTTON}</Button> : null}
        <Button type="primary" disabled={!canNext} onClick={onNext}>
          {NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
