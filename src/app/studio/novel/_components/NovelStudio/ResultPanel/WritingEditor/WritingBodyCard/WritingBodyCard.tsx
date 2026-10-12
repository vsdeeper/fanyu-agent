import StudioCard from '@/app/studio/_components/StudioCard';
import { Button } from 'antd';
import {
  POLISH_BUTTON,
  WRITE_BUTTON,
  WRITE_CHAR_COUNT,
  WRITE_UNIT_EMPTY_HINT,
} from '../../../constants';
import { countTextChars } from '../../../utils';
import styles from '../WritingEditor.module.css';
import { COPY_BUTTON } from './constants';

type WritingBodyCardProps = {
  label: string;
  body: string;
  generating: boolean;
  polishing: boolean;
  writeBusy: boolean;
  canGenerate: boolean;
  onSave: (value: string) => void;
  onGenerate: () => void;
  onPolish: () => void;
  onCopy: () => void;
};

const WRITING_CARD_STYLES = {
  header: { padding: '14px 16px', minHeight: 'auto' },
  body: { padding: '14px 16px' },
} as const;

/** 整篇或整章正文卡：正文只保留一个连续编辑区。 */
export default function WritingBodyCard({
  label,
  body,
  generating,
  polishing,
  writeBusy,
  canGenerate,
  onSave,
  onGenerate,
  onPolish,
  onCopy,
}: WritingBodyCardProps) {
  const hasBody = Boolean(body.trim());

  return (
    <StudioCard
      className={styles.writingCard}
      styles={WRITING_CARD_STYLES}
      title={<span className={styles.bodyTitle}>{label}</span>}
      extra={
        <span className={styles.extraRow}>
          <span className={styles.charCount}>{WRITE_CHAR_COUNT(countTextChars(body))}</span>
          <Button
            type="link"
            size="small"
            className={styles.generateBtn}
            loading={generating}
            disabled={writeBusy || !canGenerate}
            onClick={(event) => {
              event.stopPropagation();
              onGenerate();
            }}
          >
            {WRITE_BUTTON}
          </Button>
        </span>
      }
      editable={!generating}
      editDisabled={polishing}
      bodyActions={
        hasBody || polishing ? (
          <>
            <Button
              type="link"
              size="small"
              loading={polishing}
              disabled={writeBusy && !polishing}
              onClick={onPolish}
            >
              {POLISH_BUTTON}
            </Button>
            {hasBody ? (
              <Button type="link" size="small" disabled={writeBusy} onClick={onCopy}>
                {COPY_BUTTON}
              </Button>
            ) : null}
          </>
        ) : null
      }
      value={body}
      onSave={onSave}
      textareaRows={16}
    >
      {hasBody ? (
        <p className={styles.bodyText}>{body}</p>
      ) : (
        <p className={styles.emptyHint}>{WRITE_UNIT_EMPTY_HINT}</p>
      )}
    </StudioCard>
  );
}
