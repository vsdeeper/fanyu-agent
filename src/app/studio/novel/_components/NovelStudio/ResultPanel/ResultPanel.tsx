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
} from '../constants';
import TopicCardView from '../TopicCardView';
import type { StructureSnapshot, StudioPhase, TopicCard } from '../types';
import BeatList from './BeatList';
import ChapterList from './ChapterList';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  topics: TopicCard[];
  selectedTopicId?: string;
  structure?: StructureSnapshot;
  onSelectTopic: (id: string) => void;
  onPrev: () => void;
  onNext: () => void;
  onUpdateSynopsis: (synopsis: string) => void;
  onUpdateBeat: (beatId: string, text: string) => void;
  onRemoveBeat: (beatId: string) => void;
  onUpdateChapter: (chapterId: string, patch: { title?: string; purpose?: string }) => void;
  onRemoveChapter: (chapterId: string) => void;
};

/** 右侧结果区：选题卡或故事结构（节拍 / 章纲）。 */
export default function ResultPanel({
  phase,
  topics,
  selectedTopicId,
  structure,
  onSelectTopic,
  onPrev,
  onNext,
  onUpdateSynopsis,
  onUpdateBeat,
  onRemoveBeat,
  onUpdateChapter,
  onRemoveChapter,
}: ResultPanelProps) {
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const structureView = phase === 'structure' || phase === 'structuring' || phase === 'structured';
  const researching = phase === 'researching';
  const researched = phase === 'researched';
  const structuring = phase === 'structuring';
  const researchEmpty = researchView && !researching && topics.length === 0;
  const structureEmpty = structureView && !structuring && !structure;

  const panelTitle = structureView ? STRUCTURE_PANEL_TITLE : RESEARCH_PANEL_TITLE;
  const canPrev = structureView;
  const canNext = researched || structureView;

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
                  onChangeChapter={onUpdateChapter}
                  onRemoveChapter={onRemoveChapter}
                />
              )}
            </div>
          </div>
        ) : null
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
