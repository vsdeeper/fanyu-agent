import { useState } from 'react';
import { EditOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Input } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import type { StyleTuningSoftParams } from '@/app/api/studio/style-tuning/_shared/types';
import { useThemeMode } from '@/components/theme';
import {
  DONE_EDIT_SOFT_PARAMS_BUTTON,
  EDIT_SOFT_PARAMS_BUTTON,
  EMPTY_SOFT_TUNE_HINT,
  EMPTY_TRIAL_WRITE_HINT,
  NEXT_BUTTON,
  PREV_BUTTON,
  SOFT_PARAM_FIELDS,
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
import { useStreamScroll } from './hooks/useStreamScroll';
import styles from './ResultPanel.module.css';

type ResultPanelProps = {
  phase: StudioPhase;
  softTuneStream: string;
  softParams: StyleTuningSoftParams;
  onSoftParamChange: (key: SoftParamFieldKey, value: string) => void;
  onFinishEditSoftParams: () => void;
  trialStream: string;
  markdown: string;
  navLoading: boolean;
  onPrev: () => void;
  onNext: () => void;
};

/** 右侧结果区：软调只读为整篇流式 Markdown；点编辑后拆六维表单；试写正文只读。 */
export default function ResultPanel({
  phase,
  softTuneStream,
  softParams,
  onSoftParamChange,
  onFinishEditSoftParams,
  trialStream,
  markdown,
  navLoading,
  onPrev,
  onNext,
}: ResultPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const [wantEditSoftParams, setWantEditSoftParams] = useState(false);
  // 重新生成或离开软调结果态时退出编辑，避免用 effect 同步
  if (phase !== 'softtuned' && wantEditSoftParams) {
    setWantEditSoftParams(false);
  }
  const streaming = phase === 'softtuning' || phase === 'trialwriting';
  const softView = phase === 'softtune' || phase === 'softtuning' || phase === 'softtuned';
  const trialView = phase === 'trialwrite' || phase === 'trialwriting' || phase === 'trialwritten';
  const canPrev = trialView;
  const canNext = phase === 'softtuned' && hasCompleteSoftParams(softParams);

  const softDisplay =
    phase === 'softtuning'
      ? stripTrailingJsonFenceForDisplay(softTuneStream)
      : softTuneStream.trim() || formatSoftParamsAsMarkdown(softParams);
  const trialDisplay = phase === 'trialwriting' ? trialStream : markdown || trialStream;
  const streamContent = softView ? softDisplay : trialDisplay;
  const showSoftResult = phase === 'softtuned';
  const editingSoftParams = showSoftResult && wantEditSoftParams;
  const showSoftMarkdown = softView && !editingSoftParams && Boolean(softDisplay.trim());
  const showTrialMarkdown = trialView && Boolean(trialDisplay.trim());
  const emptyHint = softView ? EMPTY_SOFT_TUNE_HINT : EMPTY_TRIAL_WRITE_HINT;
  const hasContent = editingSoftParams || showSoftMarkdown || showTrialMarkdown;
  const trialCharCount = showTrialMarkdown ? countTextChars(trialDisplay) : 0;

  const { scrollRef, contentRef, onScroll } = useStreamScroll(hasContent, streaming, streamContent);

  const markdownClass = `${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        <span className={styles.headTitle}>
          {softView ? SOFT_TUNE_RESULT_TITLE : TRIAL_WRITE_RESULT_TITLE}
        </span>
        {showSoftResult ? (
          <Button
            type="link"
            size="small"
            className={styles.headAction}
            icon={editingSoftParams ? undefined : <EditOutlined />}
            onClick={() => {
              if (editingSoftParams) {
                onFinishEditSoftParams();
                setWantEditSoftParams(false);
                return;
              }
              setWantEditSoftParams(true);
            }}
          >
            {editingSoftParams ? DONE_EDIT_SOFT_PARAMS_BUTTON : EDIT_SOFT_PARAMS_BUTTON}
          </Button>
        ) : null}
      </div>

      {!hasContent ? (
        <div className={styles.body}>
          <p className={styles.hint}>{emptyHint}</p>
        </div>
      ) : (
        <div className={styles.scroll} ref={scrollRef} onScroll={onScroll}>
          <div className={styles.scrollContent} ref={contentRef}>
            {showSoftMarkdown && hydrated ? (
              <XMarkdown
                className={markdownClass}
                content={softDisplay}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
              />
            ) : null}

            {editingSoftParams
              ? SOFT_PARAM_FIELDS.map((field) => (
                  <div key={field.key} className={styles.field}>
                    <span className={styles.fieldLabel}>{field.label}</span>
                    <Input.TextArea
                      rows={4}
                      value={softParams[field.key]}
                      onChange={(event) => onSoftParamChange(field.key, event.target.value)}
                    />
                  </div>
                ))
              : null}

            {showTrialMarkdown && hydrated ? (
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
            disabled={!canNext || streaming}
            onClick={onNext}
          >
            {NEXT_BUTTON}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
