import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import './XMarkdownTheme.css';
import { useState } from 'react';
import { useThemeMode } from '@/components/theme';
import {
  NEXT_BUTTON,
  PREV_BUTTON,
  PRODUCT_STANDARD_BADGE,
  VISUAL_STANDARD_BADGE,
} from '../constants';
import type { StudioPhase, StudioResultImage } from '../types';
import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
  MARKDOWN_STREAMING_ON,
} from './constants';
import ResultImageGrid from './ResultImageGrid';
import { usePlanStreamScroll } from './usePlanStreamScroll';
import {
  isModelResultPhase,
  isNextDisabled,
  isPlanPhase,
  isProductViewResultPhase,
  isPrevVisible,
  isVisualResultPhase,
  toEmptyHint,
  toResultHeadTitle,
} from './utils';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  analysisText: string;
  analysisStreaming: boolean;
  productViewImages: readonly StudioResultImage[];
  visualImages: readonly StudioResultImage[];
  modelImages: readonly StudioResultImage[];
  expectedProductViewCount: number;
  expectedVisualCount: number;
  expectedModelCount: number;
  productViewAspectRatio: string;
  visualAspectRatio: string;
  modelAspectRatio: string;
  selectedProductViewIndex: number | null;
  selectedVisualIndex: number | null;
  onSelectProductView: (index: number) => void;
  onSelectVisual: (index: number) => void;
  onPrev: () => void;
  onNext: () => void;
  onAnalysisTextChange: (next: string) => void;
};

/**
 * 右侧结果区：空态、分析 Markdown（可编辑）、主视觉/模特出图网格；
 * 右下角下一步，上一步仅第二步起显示。
 */
export default function ResultPanel({
  phase,
  analysisText,
  analysisStreaming,
  productViewImages,
  visualImages,
  modelImages,
  expectedProductViewCount,
  expectedVisualCount,
  expectedModelCount,
  productViewAspectRatio,
  visualAspectRatio,
  modelAspectRatio,
  selectedProductViewIndex,
  selectedVisualIndex,
  onSelectProductView,
  onSelectVisual,
  onPrev,
  onNext,
  onAnalysisTextChange,
}: ResultPanelProps) {
  const { mode } = useThemeMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const showPlan = isPlanPhase(phase) && Boolean(analysisText);
  const showProductViewGrid = isProductViewResultPhase(phase) && productViewImages.length > 0;
  const showVisualGrid = isVisualResultPhase(phase) && visualImages.length > 0;
  const showModelGrid = isModelResultPhase(phase) && modelImages.length > 0;
  const isEditing = editing && phase === 'analyzed';
  const canEdit = phase === 'analyzed' && Boolean(analysisText) && !editing;
  const hasReadyModelImage = modelImages.some((item) => item.status === 'ready');
  const nextDisabled =
    isEditing ||
    isNextDisabled(
      phase,
      analysisText,
      selectedProductViewIndex,
      selectedVisualIndex,
      hasReadyModelImage,
    );
  const { scrollRef, contentRef, onScroll } = usePlanStreamScroll(
    showPlan,
    analysisStreaming,
    analysisText,
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
        {toResultHeadTitle(phase)}
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
      ) : showPlan ? (
        <div ref={scrollRef} className={styles.scroll} onScroll={onScroll}>
          <div ref={contentRef}>
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
          </div>
        </div>
      ) : phase === 'analyzing' ? (
        <div className={styles.body}>
          <Spin />
        </div>
      ) : showProductViewGrid ? (
        <div className={styles.scroll}>
          <ResultImageGrid
            images={productViewImages}
            expectedCount={expectedProductViewCount}
            aspectRatio={productViewAspectRatio}
            selectable={phase === 'productView'}
            selectedIndex={selectedProductViewIndex}
            selectedBadge={PRODUCT_STANDARD_BADGE}
            onSelect={onSelectProductView}
          />
        </div>
      ) : showVisualGrid ? (
        <div className={styles.scroll}>
          <ResultImageGrid
            images={visualImages}
            expectedCount={expectedVisualCount}
            aspectRatio={visualAspectRatio}
            selectable={phase === 'visual'}
            selectedIndex={selectedVisualIndex}
            selectedBadge={VISUAL_STANDARD_BADGE}
            onSelect={onSelectVisual}
          />
        </div>
      ) : showModelGrid ? (
        <div className={styles.scroll}>
          <ResultImageGrid
            images={modelImages}
            expectedCount={expectedModelCount}
            aspectRatio={modelAspectRatio}
          />
        </div>
      ) : (
        <div className={styles.body}>
          <StarOutlined className={styles.icon} />
          <p className={styles.hint}>{toEmptyHint(phase)}</p>
        </div>
      )}
      <div className={styles.footer}>
        {isPrevVisible(phase) ? (
          <Button size="large" disabled={isEditing} onClick={onPrev}>
            {PREV_BUTTON}
          </Button>
        ) : null}
        <Button size="large" type="primary" disabled={nextDisabled} onClick={onNext}>
          {NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
