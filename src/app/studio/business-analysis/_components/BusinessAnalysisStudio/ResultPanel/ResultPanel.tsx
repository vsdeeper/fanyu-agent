import { StarOutlined } from '@ant-design/icons';
import { Button, Input, Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useState } from 'react';
import { useThemeMode } from '@/components/theme';
import { COMPLETE_BUTTON, EMPTY_RESULT_HINT, RESULT_TITLE_ANALYSIS } from '../constants';
import type { StudioPhase } from '../types';
import {
  MARKDOWN_COMPONENTS,
  MARKDOWN_DISABLE_STYLES,
  MARKDOWN_STREAMING_OFF,
  MARKDOWN_STREAMING_ON,
} from './constants';
import { usePlanStreamScroll } from './hooks/usePlanStreamScroll';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  analysisText: string;
  analysisStreaming: boolean;
  nextLoading: boolean;
  onNext: () => void;
  onAnalysisTextChange: (next: string) => void;
};

/** 右侧结果区：空态、分析 Markdown（可编辑）与完成按钮。 */
export default function ResultPanel({
  phase,
  analysisText,
  analysisStreaming,
  nextLoading,
  onNext,
  onAnalysisTextChange,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const showPlan = (phase === 'analyzing' || phase === 'analyzed') && Boolean(analysisText);
  const isEditing = editing && phase === 'analyzed';
  const canEdit = phase === 'analyzed' && Boolean(analysisText) && !editing;
  const nextDisabled = isEditing || phase !== 'analyzed' || !analysisText.trim();
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
        {RESULT_TITLE_ANALYSIS}
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
      ) : (
        <div className={styles.body}>
          <StarOutlined className={styles.icon} />
          <p className={styles.hint}>{EMPTY_RESULT_HINT}</p>
        </div>
      )}
      <div className={styles.footer}>
        <Button
          size="large"
          type="primary"
          loading={nextLoading}
          disabled={nextDisabled}
          onClick={onNext}
        >
          {COMPLETE_BUTTON}
        </Button>
      </div>
    </section>
  );
}
