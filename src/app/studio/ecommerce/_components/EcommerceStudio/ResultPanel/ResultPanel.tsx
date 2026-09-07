import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin, Typography } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useState } from 'react';
import { useThemeMode } from '@/components/theme';
import type { MainImagePlanCard } from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import { COMPLETE_BUTTON, NEXT_BUTTON, PREV_BUTTON, VISUAL_STANDARD_BADGE } from '../constants';
import type { EcommerceTaskType } from '@/app/api/studio/ecommerce/_shared/task-types';
import type { DesignResultGroups, StudioPhase, StudioResultImage } from '../types';
import { isMainImageTask, isPosterTask } from '../workflow';
import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
  MARKDOWN_STREAMING_ON,
} from './constants';
import ResultImageGrid from './ResultImageGrid';
import DesignResultGroupsView from './DesignResultGroups';
import MainImagePlanCards from './MainImagePlanCards';
import { usePlanStreamScroll } from './hooks/usePlanStreamScroll';
import {
  groupResultImagesByRatio,
  isDesignResultPhase,
  isNextDisabled,
  isPlanPhase,
  isPrevVisible,
  isVisualResultPhase,
  toEmptyHint,
  toResultHeadTitle,
} from './utils';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  taskType: EcommerceTaskType;
  phase: StudioPhase;
  analysisText: string;
  analysisStreaming: boolean;
  visualImages: readonly StudioResultImage[];
  designResultGroups: DesignResultGroups;
  expectedVisualCount: number;
  selectedVisualIndex: number | null;
  nextLoading: boolean;
  isPoster?: boolean;
  visualLock?: string;
  planCards?: MainImagePlanCard[];
  selectedThemeIds?: string[];
  onSelectVisual: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onAnalysisTextChange: (next: string) => void;
  onToggleTheme?: (themeId: string) => void;
  onVisualLockSave?: (next: string) => void;
  onPlanCardSave?: (themeId: string, requirement: string) => void;
};

/**
 * 右侧结果区：空态、分析 Markdown 或主图主题卡、主视觉与设计结果；
 * 右下角下一步，上一步仅第二步起显示。
 */
export default function ResultPanel({
  taskType,
  phase,
  analysisText,
  analysisStreaming,
  visualImages,
  designResultGroups,
  expectedVisualCount,
  selectedVisualIndex,
  nextLoading,
  isPoster = false,
  visualLock = '',
  planCards = [],
  selectedThemeIds = [],
  onSelectVisual,
  onPrev,
  onNext,
  onAnalysisTextChange,
  onToggleTheme,
  onVisualLockSave,
  onPlanCardSave,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [planEditing, setPlanEditing] = useState(false);
  const mainImage = isMainImageTask(taskType);
  const showPlan = isPlanPhase(phase) && Boolean(analysisText) && !mainImage;
  const showMainImagePlan =
    mainImage && isPlanPhase(phase) && (Boolean(visualLock) || planCards.length > 0);
  const showVisualGrid = isVisualResultPhase(phase) && visualImages.length > 0;
  const visualRatioGroups = groupResultImagesByRatio(visualImages);
  const showDesignGroups =
    isDesignResultPhase(phase) &&
    Object.values(designResultGroups).some((images) => Boolean(images?.length));
  const isEditing = editing && phase === 'analyzed';
  const canEdit = phase === 'analyzed' && Boolean(analysisText) && !editing && !mainImage;
  const hasDesignResults = Object.values(designResultGroups).some((images) =>
    images?.some((image) => image.status === 'ready' && Boolean(image.url)),
  );
  const nextDisabled =
    isEditing ||
    isNextDisabled(phase, analysisText, selectedVisualIndex, hasDesignResults, {
      isMainImage: mainImage,
      selectedThemeCount: selectedThemeIds.length,
      isEditing: planEditing,
    });
  const { scrollRef, contentRef, onScroll } = usePlanStreamScroll(
    showPlan || showMainImagePlan,
    analysisStreaming,
    showMainImagePlan
      ? `${visualLock}\n${planCards.map((card) => card.requirement).join('\n')}`
      : analysisText,
  );

  const startEdit = () => {
    setDraft(analysisText);
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);
  const saveEdit = () => {
    const next = draft.trim();
    if (next && next !== analysisText) onAnalysisTextChange(draft);
    setEditing(false);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {toResultHeadTitle(phase, taskType)}
        <div className={styles.headActions}>
          {isEditing ? (
            <>
              <Button size="small" onClick={cancelEdit}>
                取消
              </Button>
              <Button size="small" type="primary" onClick={saveEdit}>
                保存
              </Button>
            </>
          ) : (
            canEdit && (
              <Button size="small" onClick={startEdit}>
                编辑
              </Button>
            )
          )}
        </div>
      </div>
      {isEditing ? (
        <div className={styles.scroll}>
          <Input.TextArea
            className={styles.editor}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            style={{ height: '100%' }}
          />
        </div>
      ) : showMainImagePlan ? (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef}>
            <MainImagePlanCards
              visualLock={visualLock}
              cards={planCards}
              selectedThemeIds={selectedThemeIds}
              streaming={analysisStreaming}
              onToggleTheme={onToggleTheme ?? (() => undefined)}
              onVisualLockSave={onVisualLockSave ?? (() => undefined)}
              onCardSave={onPlanCardSave ?? (() => undefined)}
              onEditingChange={setPlanEditing}
            />
          </div>
        </div>
      ) : showPlan ? (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef}>
            {hydrated ? (
              <XMarkdown
                className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
                content={analysisText}
                components={MARKDOWN_COMPONENTS}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
                streaming={analysisStreaming ? MARKDOWN_STREAMING_ON : MARKDOWN_STREAMING_OFF}
                disableDefaultStyles={MARKDOWN_DISABLE_STYLES}
              />
            ) : null}
          </div>
        </div>
      ) : phase === 'analyzing' ? (
        <div className={styles.body}>
          <Spin />
        </div>
      ) : showVisualGrid ? (
        <div className={styles.scroll}>
          <div className={styles.resultGroups}>
            {visualRatioGroups.map(({ aspectRatio, images }) => (
              <section key={aspectRatio} className={styles.resultGroup}>
                <Typography.Text className={styles.ratioTitle}>{aspectRatio}</Typography.Text>
                <ResultImageGrid
                  images={images}
                  expectedCount={expectedVisualCount}
                  aspectRatio={aspectRatio}
                  selectable={phase === 'visual'}
                  selectedIndex={selectedVisualIndex}
                  selectedBadge={VISUAL_STANDARD_BADGE}
                  onSelect={onSelectVisual}
                />
              </section>
            ))}
          </div>
        </div>
      ) : showDesignGroups ? (
        <div className={styles.scroll}>
          <DesignResultGroupsView
            groups={designResultGroups}
            showTitles={!isPosterTask(taskType) && !mainImage}
            groupByTheme={mainImage}
          />
        </div>
      ) : (
        <div className={styles.body}>
          <StarOutlined className={styles.icon} />
          <p className={styles.hint}>{toEmptyHint(phase, taskType)}</p>
        </div>
      )}
      <div className={styles.footer}>
        {isPrevVisible(phase, isPoster, mainImage) ? (
          <Button size="large" disabled={isEditing || planEditing} onClick={onPrev}>
            {PREV_BUTTON}
          </Button>
        ) : null}
        <Button
          size="large"
          type="primary"
          loading={nextLoading}
          disabled={nextDisabled}
          onClick={onNext}
        >
          {isDesignResultPhase(phase) ? COMPLETE_BUTTON : NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
