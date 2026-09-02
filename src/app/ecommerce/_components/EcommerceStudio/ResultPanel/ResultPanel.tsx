import { StarOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import './XMarkdownTheme.css';
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
};

/**
 * 右侧结果区：空态、分析等待 Spin、流式规划 Markdown（贴底跟随）、出图网格，右下角上一步/下一步。
 */
export default function ResultPanel({
  phase,
  analysisText,
  analysisStreaming,
  images,
  expectedImageCount,
  onPrev,
  onNext,
}: ResultPanelProps) {
  const { mode } = useThemeMode();
  const showPlan = (phase === 'analyzing' || phase === 'confirm') && Boolean(analysisText);
  const showImages = phase === 'generating' || phase === 'done';
  const { scrollRef, contentRef, onScroll } = usePlanStreamScroll(
    showPlan,
    analysisStreaming,
    analysisText,
  );

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        生成结果
      </div>
      {showPlan ? (
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
        <Button disabled={isPrevDisabled(phase)} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        <Button type="primary" disabled={isNextDisabled(phase)} onClick={onNext}>
          {NEXT_BUTTON}
        </Button>
      </div>
    </section>
  );
}
