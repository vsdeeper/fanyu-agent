import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin, Tag, Typography } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useState } from 'react';
import { useThemeMode } from '@/components/theme';
import AnnotatedMarkdown from '../AnnotatedMarkdown';
import AngleCardView from '../AngleCardView';
import ImageSlotDrawer from '../ImageSlotDrawer';
import {
  CANCEL_BUTTON,
  EDIT_BUTTON,
  EMPTY_DRAFT_HINT,
  EMPTY_IMAGES_HINT,
  EMPTY_PLAN_HINT,
  EMPTY_RESEARCH_HINT,
  NEXT_BUTTON,
  PLAN_GENERATING_HINT,
  PREV_BUTTON,
  RESEARCH_ANGLES_TITLE,
  RESEARCH_BRIEF_TITLE,
  RESEARCH_PACKING_HINT,
  RESEARCH_SOURCES_TITLE,
  SAVE_BUTTON,
  SOURCE_KIND_LABEL,
} from '../constants';
import type {
  AngleCard,
  ImageHistoryItem,
  ImageSlot,
  PlanStepSnapshot,
  ResearchSource,
  StudioPhase,
} from '../types';
import {
  cleanResearchBrief,
  countTextChars,
  hasTrailingJsonFence,
  stripTrailingJsonFenceForDisplay,
} from '../utils';
import { useStreamScroll } from './hooks/useStreamScroll';
import TitleDirectionList from './TitleDirectionList';
import BeatList from './BeatList';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  researchStream: string;
  sources: ResearchSource[];
  angles: AngleCard[];
  selectedAngleId?: string;
  onSelectAngle: (id: string) => void;
  plan?: PlanStepSnapshot;
  onPlanBeatsChange: (beats: string[]) => void;
  onSelectTitleDirection: (index: number) => void;
  onChangeTitleDirection: (index: number, value: string) => void;
  draftStream: string;
  markdown: string;
  onMarkdownChange: (value: string) => void;
  imagesStream: string;
  imageSlots: ImageSlot[];
  imageHistory: ImageHistoryItem[];
  imageVisualStyle: string;
  slotDrawerOpen: boolean;
  activeSlotId?: string;
  onOpenSlotDrawer: (slotId?: string) => void;
  onCloseSlotDrawer: () => void;
  onSelectSlot: (slotId: string) => void;
  onVisualStyleChange: (value: string) => void;
  onSlotPromptChange: (slotId: string, prompt: string) => void;
  onSlotAspectRatioChange: (slotId: string, aspectRatio: string) => void;
  onSlotModelChange: (slotId: string, model: string) => void;
  onSlotClarityChange: (slotId: string, clarity: string) => void;
  onGenerateSlot: (slotId: string) => void;
  onUploadSlot: (slotId: string, file: File) => void;
  onApplyHistory: (historyId: string) => void;
  onRemoveHistory: (historyId: string) => void;
  onCopyImage: (url: string) => void;
  navLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** 右侧结果区：调研 / 思路 / 成稿 / 成稿配图（标注可点开槽位抽屉）。 */
export default function ResultPanel({
  phase,
  researchStream,
  sources,
  angles,
  selectedAngleId,
  onSelectAngle,
  plan,
  onPlanBeatsChange,
  onSelectTitleDirection,
  onChangeTitleDirection,
  draftStream,
  markdown,
  onMarkdownChange,
  imagesStream,
  imageSlots,
  imageHistory,
  imageVisualStyle,
  slotDrawerOpen,
  activeSlotId,
  onOpenSlotDrawer,
  onCloseSlotDrawer,
  onSelectSlot,
  onVisualStyleChange,
  onSlotPromptChange,
  onSlotAspectRatioChange,
  onSlotModelChange,
  onSlotClarityChange,
  onGenerateSlot,
  onUploadSlot,
  onApplyHistory,
  onRemoveHistory,
  onCopyImage,
  navLoading,
  onPrev,
  onNext,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const streaming =
    phase === 'researching' ||
    phase === 'planning' ||
    phase === 'drafting' ||
    phase === 'illustrating';
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planView = phase === 'plan' || phase === 'planning' || phase === 'planned';
  const draftView = phase === 'draft' || phase === 'drafting' || phase === 'drafted';
  const imagesView = phase === 'images' || phase === 'illustrating' || phase === 'illustrated';

  if ((phase === 'drafting' || !draftView) && editing) {
    setEditing(false);
  }
  const isEditing = editing && draftView && phase !== 'drafting';
  const canEditDraft = draftView && phase !== 'drafting' && Boolean(markdown.trim()) && !editing;
  const canPrev = !researchView;
  const canNext =
    (phase === 'researched' && Boolean(selectedAngleId)) ||
    (phase === 'planned' && Boolean(plan)) ||
    (phase === 'drafted' && Boolean(markdown.trim())) ||
    (phase === 'illustrated' && Boolean(markdown.trim()));

  const title = researchView
    ? '选题调研'
    : planView
      ? '内容思路'
      : draftView
        ? '成稿写作'
        : '成稿配图';
  const researchBrief = cleanResearchBrief(researchStream);
  const researchDone = phase === 'researched';
  // 简报正文流完（末尾 JSON 围栏出现）才提示「正在整理来源与角度」：正文本身已是在动，
  // 早于此刻挂加载会让整个流式过程一直顶着同一句提示
  const researchPacking =
    phase === 'researching' &&
    hasTrailingJsonFence(researchStream) &&
    sources.length === 0 &&
    angles.length === 0;
  const draftDisplay = isEditing
    ? draft
    : phase === 'drafting'
      ? draftStream || markdown
      : markdown || draftStream;
  const imagesDisplay =
    phase === 'illustrating'
      ? stripTrailingJsonFenceForDisplay(imagesStream || markdown)
      : markdown;
  const draftCharCount = draftDisplay.trim() ? countTextChars(draftDisplay) : 0;
  const imagesCharCount = imagesDisplay.trim() ? countTextChars(imagesDisplay) : 0;
  const markdownClass = `${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`;
  const activeLabel = imageSlots.find((slot) => slot.id === activeSlotId)?.label;
  // 思路区没有流式正文，加载态一次性换成卡片，不参与贴底跟随
  const followContent = researchView
    ? `${researchBrief}\n${sources.length}\n${angles.length}\n${researchPacking ? '1' : '0'}`
    : planView
      ? ''
      : draftView
        ? draftStream
        : imagesStream;
  const scrollFollowEnabled =
    (researchView && (Boolean(researchBrief) || researchDone || sources.length > 0)) ||
    (draftView && Boolean(draftStream || markdown)) ||
    (imagesView && Boolean(imagesStream || markdown));
  const { scrollRef, contentRef, onScroll } = useStreamScroll(
    scrollFollowEnabled && !isEditing,
    streaming,
    followContent,
  );

  function startEdit() {
    setDraft(markdown);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
  }

  function saveEdit() {
    const next = draft.trim();
    if (next && next !== markdown) onMarkdownChange(draft);
    setEditing(false);
  }

  function handleMarkerClick(label: string) {
    const slot = imageSlots.find((item) => item.label === label);
    onOpenSlotDrawer(slot?.id);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {title}
        {draftView ? (
          <div className={styles.headActions}>
            {isEditing ? (
              <>
                <Button size="small" onClick={cancelEdit}>
                  {CANCEL_BUTTON}
                </Button>
                <Button size="small" type="primary" onClick={saveEdit}>
                  {SAVE_BUTTON}
                </Button>
              </>
            ) : canEditDraft ? (
              <Button size="small" onClick={startEdit}>
                {EDIT_BUTTON}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {streaming && !planView && !researchBrief && !draftStream && !imagesStream && !markdown ? (
        <div className={styles.body}>
          <Spin />
        </div>
      ) : researchView ? (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef} className={styles.scrollContent}>
            {!researchDone && !researchBrief && sources.length === 0 && angles.length === 0 ? (
              <div className={styles.body}>
                {phase === 'researching' ? (
                  <Spin />
                ) : (
                  <p className={styles.hint}>{EMPTY_RESEARCH_HINT}</p>
                )}
              </div>
            ) : (
              <>
                {researchBrief ? (
                  <>
                    <p className={styles.sectionTitle}>{RESEARCH_BRIEF_TITLE}</p>
                    {hydrated ? (
                      <XMarkdown
                        className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
                        content={researchBrief}
                        paragraphTag="div"
                        openLinksInNewTab
                        escapeRawHtml
                      />
                    ) : null}
                  </>
                ) : null}
                {researchPacking ? (
                  <div className={styles.packingHint}>
                    <Spin size="small" />
                    <span>{RESEARCH_PACKING_HINT}</span>
                  </div>
                ) : null}
                {sources.length > 0 ? (
                  <>
                    <p className={styles.sectionTitle}>{RESEARCH_SOURCES_TITLE}</p>
                    <ul className={styles.sourceList}>
                      {sources.map((item, index) => (
                        <li key={`${item.url}-${item.title}`} className={styles.sourceItem}>
                          <div className={styles.sourceBody}>
                            <Tag className={styles.sourceKind}>{SOURCE_KIND_LABEL[item.kind]}</Tag>
                            <Typography.Link href={item.url} target="_blank" rel="noreferrer">
                              {item.title}
                            </Typography.Link>
                            {item.publishedAt ? (
                              <span className={styles.sourceDate}>{item.publishedAt}</span>
                            ) : null}
                            <span className={styles.sourceBlurb}> — {item.blurb}</span>
                          </div>
                          <span className={styles.sourceIndex} aria-hidden>
                            {index + 1}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
                {angles.length > 0 ? (
                  <div className={styles.angleSection}>
                    <p className={styles.sectionTitle}>{RESEARCH_ANGLES_TITLE}</p>
                    <div className={styles.angleList}>
                      {angles.map((angle) => (
                        <AngleCardView
                          key={angle.id}
                          angle={angle}
                          selected={selectedAngleId === angle.id}
                          onSelect={() => onSelectAngle(angle.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : planView ? (
        phase === 'planning' || !plan ? (
          <div className={styles.body}>
            {phase === 'planning' ? (
              <>
                <Spin />
                <p className={styles.hint}>{PLAN_GENERATING_HINT}</p>
              </>
            ) : (
              <p className={styles.hint}>{EMPTY_PLAN_HINT}</p>
            )}
          </div>
        ) : (
          <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
            <div ref={contentRef} className={styles.scrollContent}>
              {plan.titleDirections?.length ? (
                <TitleDirectionList
                  titles={plan.titleDirections}
                  selectedIndex={plan.selectedTitleIndex}
                  onSelect={onSelectTitleDirection}
                  onChangeTitle={onChangeTitleDirection}
                />
              ) : null}
              <BeatList
                beats={plan.beats}
                onChangeBeat={(index, value) => {
                  const next = [...plan.beats];
                  next[index] = value;
                  onPlanBeatsChange(next);
                }}
                onRemoveBeat={(index) => {
                  onPlanBeatsChange(plan.beats.filter((_, i) => i !== index));
                }}
              />
            </div>
          </div>
        )
      ) : imagesView ? (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef} className={styles.scrollContent}>
            {!imagesDisplay.trim() ? (
              <div className={styles.body}>
                {phase === 'illustrating' ? (
                  <Spin />
                ) : (
                  <p className={styles.hint}>{EMPTY_IMAGES_HINT}</p>
                )}
              </div>
            ) : hydrated ? (
              <>
                <AnnotatedMarkdown
                  markdown={imagesDisplay}
                  markdownClassName={markdownClass}
                  imageSlots={imageSlots}
                  activeLabel={activeLabel}
                  onMarkerClick={handleMarkerClick}
                />
                <p className={styles.charCount}>共 {imagesCharCount} 字</p>
              </>
            ) : null}
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef} className={styles.scrollContent}>
            {!markdown && !draftStream ? (
              <div className={styles.body}>
                <p className={styles.hint}>{EMPTY_DRAFT_HINT}</p>
              </div>
            ) : (
              <>
                {isEditing ? (
                  <Input.TextArea
                    className={styles.editor}
                    autoSize={{ minRows: 6 }}
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                  />
                ) : draftDisplay.trim() && hydrated ? (
                  <XMarkdown
                    className={markdownClass}
                    content={draftDisplay}
                    paragraphTag="div"
                    openLinksInNewTab
                    escapeRawHtml
                  />
                ) : null}
                {draftDisplay.trim() ? (
                  <p className={styles.charCount}>共 {draftCharCount} 字</p>
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <Button size="large" disabled={!canPrev || streaming || isEditing} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        <Button
          size="large"
          type="primary"
          loading={navLoading}
          disabled={!canNext || streaming || isEditing}
          onClick={onNext}
        >
          {NEXT_BUTTON}
        </Button>
      </div>

      {imagesView ? (
        <ImageSlotDrawer
          open={slotDrawerOpen}
          imageSlots={imageSlots}
          imageHistory={imageHistory}
          imageVisualStyle={imageVisualStyle}
          activeSlotId={activeSlotId}
          onClose={onCloseSlotDrawer}
          onSelectSlot={onSelectSlot}
          onVisualStyleChange={onVisualStyleChange}
          onSlotPromptChange={onSlotPromptChange}
          onSlotAspectRatioChange={onSlotAspectRatioChange}
          onSlotModelChange={onSlotModelChange}
          onSlotClarityChange={onSlotClarityChange}
          onGenerateSlot={onGenerateSlot}
          onUploadSlot={onUploadSlot}
          onApplyHistory={onApplyHistory}
          onRemoveHistory={onRemoveHistory}
          onCopyImage={onCopyImage}
        />
      ) : null}
    </section>
  );
}
