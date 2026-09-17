import { useState } from 'react';
import { StarOutlined } from '@ant-design/icons';
import { Button, Spin } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import type { StyleTuningSoftParams } from '@/app/api/studio/style-tuning/_shared/types';
import { useThemeMode } from '@/components/theme';
import {
  EMPTY_SOFT_TUNE_HINT,
  EMPTY_TRIAL_WRITE_HINT,
  NEXT_BUTTON,
  PREV_BUTTON,
  SOFT_TUNE_RESULT_TITLE,
  TRIAL_WRITE_RESULT_TITLE,
} from '../constants';
import type { SoftParamFieldKey, StudioPhase } from '../types';
import {
  formatSoftParamsAsMarkdown,
  hasCompleteSoftParams,
  countTextChars,
  stripTrailingJsonFenceForDisplay,
} from '../utils';
import SoftParamCards from './SoftParamCards';
import { useStreamScroll } from './hooks/useStreamScroll';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  softTuneStream: string;
  softParams: StyleTuningSoftParams;
  onSoftParamSave: (key: SoftParamFieldKey, value: string) => void | Promise<void>;
  trialStream: string;
  markdown: string;
  navLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** 右侧结果区：软调流式 Markdown；完成后六维卡片可逐卡编辑；试写正文只读。 */
export default function ResultPanel({
  phase,
  softTuneStream,
  softParams,
  onSoftParamSave,
  trialStream,
  markdown,
  navLoading,
  onPrev,
  onNext,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const [editingSoftParams, setEditingSoftParams] = useState(false);
  // 离开软调结果态时退出编辑标记，避免用 effect 同步
  if (phase !== 'softtuned' && editingSoftParams) {
    setEditingSoftParams(false);
  }

  const streaming = phase === 'softtuning' || phase === 'trialwriting';
  const softView = phase === 'softtune' || phase === 'softtuning' || phase === 'softtuned';
  const trialView = phase === 'trialwrite' || phase === 'trialwriting' || phase === 'trialwritten';
  const canPrev = trialView;
  const canNext = phase === 'softtuned' && hasCompleteSoftParams(softParams) && !editingSoftParams;

  const softDisplay =
    phase === 'softtuning'
      ? stripTrailingJsonFenceForDisplay(softTuneStream)
      : softTuneStream.trim() || formatSoftParamsAsMarkdown(softParams);
  const trialDisplay = phase === 'trialwriting' ? trialStream : markdown || trialStream;
  const streamContent = softView ? softDisplay : trialDisplay;
  const showSoftCards = phase === 'softtuned' && hasCompleteSoftParams(softParams);
  const showSoftMarkdown = softView && !showSoftCards && Boolean(softDisplay.trim());
  const showTrialMarkdown = trialView && Boolean(trialDisplay.trim());
  const emptyHint = softView ? EMPTY_SOFT_TUNE_HINT : EMPTY_TRIAL_WRITE_HINT;
  const hasContent = showSoftCards || showSoftMarkdown || showTrialMarkdown;
  // XMarkdown 不能安全 SSR：水合前用 Spin，避免空壳标题闪一下
  const waitingMarkdown = hasContent && !hydrated;
  const trialCharCount = showTrialMarkdown ? countTextChars(trialDisplay) : 0;

  const { scrollRef, contentRef, onScroll } = useStreamScroll(
    hasContent && hydrated,
    streaming,
    streamContent,
  );

  const markdownClass = `${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        <span className={styles.headTitle}>
          {softView ? SOFT_TUNE_RESULT_TITLE : TRIAL_WRITE_RESULT_TITLE}
        </span>
      </div>

      {!hasContent ? (
        <div className={styles.body}>
          <p className={styles.hint}>{emptyHint}</p>
        </div>
      ) : waitingMarkdown ? (
        <div className={styles.body}>
          <Spin />
        </div>
      ) : (
        <div className={styles.scroll} ref={scrollRef} onScroll={onScroll}>
          <div className={styles.scrollContent} ref={contentRef}>
            {showSoftMarkdown ? (
              <XMarkdown
                className={markdownClass}
                content={softDisplay}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
              />
            ) : null}

            {showSoftCards ? (
              <SoftParamCards
                streamText={softTuneStream}
                softParams={softParams}
                onSave={onSoftParamSave}
                onEditingChange={setEditingSoftParams}
              />
            ) : null}

            {showTrialMarkdown ? (
              <XMarkdown
                className={markdownClass}
                content={trialDisplay}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
              />
            ) : null}

            {showTrialMarkdown ? <p className={styles.charCount}>共 {trialCharCount} 字</p> : null}
          </div>
        </div>
      )}

      <div className={styles.footer}>
        <Button disabled={!canPrev || streaming} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
        {softView ? (
          <Button
            type="primary"
            loading={navLoading}
            disabled={!canNext || streaming || waitingMarkdown}
            onClick={onNext}
          >
            {NEXT_BUTTON}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
