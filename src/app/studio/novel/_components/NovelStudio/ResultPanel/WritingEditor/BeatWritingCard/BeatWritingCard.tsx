import StudioCard from '@/app/studio/_components/StudioCard';
import { Button } from 'antd';
import { WRITE_BUTTON, WRITE_CHAR_COUNT, WRITE_UNIT_EMPTY_HINT } from '../../../constants';
import { countTextChars } from '../../../utils';
import styles from '../WritingEditor.module.css';

type BeatWritingCardProps = {
  index: number;
  summary: string;
  body: string;
  /** 本节拍正在生成（显示 loading）。 */
  generating: boolean;
  /** 任意写作生成进行中（禁用其它生成入口，避免打断）。 */
  writeBusy: boolean;
  onSave: (value: string) => void;
  onGenerate: () => void;
};

const BEAT_CARD_STYLES = {
  header: { padding: '14px 16px', minHeight: 'auto' },
  body: { padding: '14px 16px' },
} as const;

/** 单节拍正文卡：标题区为摘要，正文区为生成内容；extra 生成。 */
export default function BeatWritingCard({
  index,
  summary,
  body,
  generating,
  writeBusy,
  onSave,
  onGenerate,
}: BeatWritingCardProps) {
  const hasBody = Boolean(body.trim());
  const charCount = countTextChars(body);

  return (
    <StudioCard
      className={styles.beatCard}
      styles={BEAT_CARD_STYLES}
      title={
        <span className={styles.summaryTitle}>
          <span className={styles.summaryIndex} aria-hidden>
            {index}
          </span>
          <span className={styles.summaryText}>{summary}</span>
        </span>
      }
      extra={
        <span className={styles.extraRow}>
          <span className={styles.charCount}>{WRITE_CHAR_COUNT(charCount)}</span>
          <Button
            type="link"
            size="small"
            className={styles.generateBtn}
            loading={generating}
            disabled={writeBusy}
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
      value={body}
      onSave={onSave}
      textareaRows={6}
      editorClassName={styles.editorIndent}
    >
      {hasBody ? (
        <p className={styles.bodyText}>{body}</p>
      ) : (
        <p className={styles.emptyHint}>{WRITE_UNIT_EMPTY_HINT}</p>
      )}
    </StudioCard>
  );
}
