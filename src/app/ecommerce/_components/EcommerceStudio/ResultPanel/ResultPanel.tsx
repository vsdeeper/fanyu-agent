import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import './XMarkdownTheme.css';
import { useState } from 'react';
import { useThemeMode } from '@/components/theme';
import { EMPTY_RESULT_HINT, NEXT_BUTTON, PREV_BUTTON } from '../constants';
import type { StudioPhase, StudioResultImage } from '../types';
import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
  MARKDOWN_STREAMING_ON,
} from './constants';
import ResultImageGrid from './ResultImageGrid';
import { usePlanStreamScroll } from './usePlanStreamScroll';
import { isNextDisabled, isPrevDisabled } from './utils';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  analysisText: string;
  analysisStreaming: boolean;
  images: readonly StudioResultImage[];
  expectedImageCount: number;
  onPrev: () => void;
  onNext: () => void;
  onAnalysisTextChange: (next: string) => void;
};

/**
 * 右侧结果区：空态、分析等待 Spin、流式规划 Markdown（贴底跟随，可编辑）、出图网格，右下角上一步/下一步。
 */
export default function ResultPanel({
  phase,
  analysisText,
  analysisStreaming,
  images,
  expectedImageCount,
  onPrev,
  onNext,
  onAnalysisTextChange,
}: ResultPanelProps) {
  const { mode } = useThemeMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const showPlan = (phase === 'analyzing' || phase === 'confirm') && Boolean(analysisText);
  const showImages = phase === 'generating' || phase === 'done';
  // 编辑态仅在确认阶段生效（footer 在上一步/下一步期间被禁用，故编辑时不会离开 confirm）
  const isEditing = editing && phase === 'confirm';
  // 仅确认阶段（内容已输出完毕）且已有内容时才可进入编辑
  const canEdit = phase === 'confirm' && Boolean(analysisText) && !editing;
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
        生成结果
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
      ) : showImages ? (
        <div className={styles.scroll}>
          <ResultImageGrid images={images} expectedCount={expectedImageCount} />
        </div>
      ) : (
        <div className={styles.body}>
          <StarOutlined className={styles.icon} />
          <p className={styles.hint}>{EMPTY_RESULT_HINT}</p>
        </div>
      )}
      <div className={styles.footer}>
        <Button size="large" disabled={isEditing || isPrevDisabled(phase)} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        <Button
          size="large"
          type="primary"
          disabled={isEditing || isNextDisabled(phase)}
          onClick={onNext}
        >
          {NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
