import { PlusOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Image, Input, Select, Spin, Tag, Typography } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useThemeMode } from '@/components/theme';
import { toClarityOptions, toModelOptions } from '@/app/studio/_utils/model-options';
import AngleCardView from '../AngleCardView';
import {
  COPY_IMAGE_BUTTON,
  EMPTY_DRAFT_HINT,
  EMPTY_PLAN_HINT,
  EMPTY_RESEARCH_HINT,
  GENERATE_SLOT_BUTTON,
  NEXT_BUTTON,
  PREV_BUTTON,
  RESEARCH_ANGLES_TITLE,
  RESEARCH_BRIEF_TITLE,
  RESEARCH_PACKING_HINT,
  RESEARCH_SOURCES_TITLE,
  SOURCE_KIND_LABEL,
} from '../constants';
import type { AngleCard, ImageSlot, PlanStepSnapshot, ResearchSource, StudioPhase } from '../types';
import { cleanResearchBrief } from '../utils';
import { useStreamScroll } from './hooks/useStreamScroll';
import TitleDirectionList from './TitleDirectionList';
import BeatList from './BeatList';
import styles from './ResultPanel.module.css';

const ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '16:9', label: '16:9' },
];

type ResultPanelProps = {
  phase: StudioPhase;
  researchStream: string;
  sources: ResearchSource[];
  angles: AngleCard[];
  selectedAngleId?: string;
  onSelectAngle: (id: string) => void;
  planStream: string;
  plan?: PlanStepSnapshot;
  onPlanBeatsChange: (beats: string[]) => void;
  onSelectTitleDirection: (index: number) => void;
  onChangeTitleDirection: (index: number, value: string) => void;
  draftStream: string;
  markdown: string;
  onMarkdownChange: (value: string) => void;
  imageSlots: ImageSlot[];
  imageModel: string;
  imageAspectRatio: string;
  imageClarity: string;
  onImageModelChange: (value: string) => void;
  onImageAspectRatioChange: (value: string) => void;
  onImageClarityChange: (value: string) => void;
  onSlotPromptChange: (slotId: string, prompt: string) => void;
  onGenerateSlot: (slotId: string) => void;
  onCopyImage: (url: string) => void;
  onAddSlot: () => void;
  navLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** 右侧结果区：检索简报 / 参考来源 / 角度卡、可编辑思路、正文与配图槽。 */
export default function ResultPanel({
  phase,
  researchStream,
  sources,
  angles,
  selectedAngleId,
  onSelectAngle,
  planStream,
  plan,
  onPlanBeatsChange,
  onSelectTitleDirection,
  onChangeTitleDirection,
  draftStream,
  markdown,
  onMarkdownChange,
  imageSlots,
  imageModel,
  imageAspectRatio,
  imageClarity,
  onImageModelChange,
  onImageAspectRatioChange,
  onImageClarityChange,
  onSlotPromptChange,
  onGenerateSlot,
  onCopyImage,
  onAddSlot,
  navLoading,
  onPrev,
  onNext,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const streaming = phase === 'researching' || phase === 'planning' || phase === 'drafting';
  const researchView = phase === 'research' || phase === 'researching' || phase === 'researched';
  const planView = phase === 'plan' || phase === 'planning' || phase === 'planned';
  // 选题调研是第一步，无上一步可退（含 researched 结果态）
  const canPrev = !researchView;
  const canNext =
    (phase === 'researched' && Boolean(selectedAngleId)) ||
    (phase === 'planned' && Boolean(plan)) ||
    (phase === 'drafted' && Boolean(markdown.trim()));

  const title = researchView ? '选题调研' : planView ? '内容思路' : '成稿写作';
  const researchBrief = cleanResearchBrief(researchStream);
  const researchDone = phase === 'researched';
  const researchPacking =
    phase === 'researching' &&
    Boolean(researchBrief) &&
    sources.length === 0 &&
    angles.length === 0;
  const followContent = researchView
    ? `${researchBrief}\n${sources.length}\n${angles.length}\n${researchPacking ? '1' : '0'}`
    : planView
      ? planStream
      : draftStream;
  const scrollFollowEnabled =
    (researchView && (Boolean(researchBrief) || researchDone || sources.length > 0)) ||
    (planView && Boolean(planStream || plan)) ||
    (!researchView && !planView && Boolean(draftStream || markdown));
  const { scrollRef, contentRef, onScroll } = useStreamScroll(
    scrollFollowEnabled,
    streaming,
    followContent,
  );

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {title}
      </div>

      {streaming && !researchBrief && !planStream && !draftStream && !markdown ? (
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
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef} className={styles.scrollContent}>
            {!plan && !planStream ? (
              <div className={styles.body}>
                <p className={styles.hint}>{EMPTY_PLAN_HINT}</p>
              </div>
            ) : plan ? (
              <>
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
                />
              </>
            ) : planStream && hydrated ? (
              <XMarkdown
                className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
                content={planStream}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
              />
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
                {markdown ? (
                  <Input.TextArea
                    rows={16}
                    value={markdown}
                    onChange={(event) => onMarkdownChange(event.target.value)}
                  />
                ) : draftStream && hydrated ? (
                  <XMarkdown
                    className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
                    content={draftStream}
                    paragraphTag="div"
                    openLinksInNewTab
                    escapeRawHtml
                  />
                ) : null}

                <p className={styles.sectionTitle}>配图槽（手动生成，不会自动出图）</p>
                <div className={styles.slotActions}>
                  <Select
                    style={{ minWidth: 180 }}
                    value={imageModel}
                    options={toModelOptions()}
                    onChange={onImageModelChange}
                  />
                  <Select
                    style={{ minWidth: 100 }}
                    value={imageAspectRatio}
                    options={ASPECT_RATIO_OPTIONS}
                    onChange={onImageAspectRatioChange}
                  />
                  <Select
                    style={{ minWidth: 120 }}
                    value={imageClarity}
                    options={toClarityOptions(imageModel)}
                    onChange={onImageClarityChange}
                  />
                  <Button icon={<PlusOutlined />} onClick={onAddSlot}>
                    添加槽位
                  </Button>
                </div>
                <div className={styles.slotList}>
                  {imageSlots.map((slot) => (
                    <div key={slot.id} className={styles.slotCard}>
                      <Tag>{slot.role === 'cover' ? '封面' : '文中'}</Tag>
                      <Input.TextArea
                        rows={3}
                        value={slot.promptDraft}
                        placeholder="配图提示词"
                        onChange={(event) => onSlotPromptChange(slot.id, event.target.value)}
                      />
                      {slot.assetUrl ? (
                        <Image src={slot.assetUrl} alt={slot.id} className={styles.slotPreview} />
                      ) : null}
                      <div className={styles.slotActions}>
                        <Button
                          type="primary"
                          loading={slot.generating}
                          onClick={() => onGenerateSlot(slot.id)}
                        >
                          {GENERATE_SLOT_BUTTON}
                        </Button>
                        {slot.assetUrl ? (
                          <Button onClick={() => onCopyImage(slot.assetUrl!)}>
                            {COPY_IMAGE_BUTTON}
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <Button size="large" disabled={!canPrev || streaming} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        <Button
          size="large"
          type="primary"
          loading={navLoading}
          disabled={!canNext || streaming}
          onClick={onNext}
        >
          {NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
