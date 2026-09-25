import StudioCard from '@/app/studio/_components/StudioCard';
import { Button } from 'antd';
import { WRITE_BUTTON, WRITE_CHAR_COUNT, WRITE_UNIT_EMPTY_HINT } from '../../../constants';
import { countTextChars } from '../../../utils';
import styles from '../WritingEditor.module.css';

type BeatWritingCardProps = {
  index: number;
  summary: string;
  body: string;
  generating: boolean;
  onSave: (value: string) => void;
  onGenerate: () => void;
};

/** 单节拍正文卡：标题区为摘要，正文区为生成内容；extra 生成。 */
export default function BeatWritingCard({
  index,
  summary,
  body,
  generating,
  onSave,
  onGenerate,
}: BeatWritingCardProps) {
  const hasBody = Boolean(body.trim());
  const charCount = countTextChars(body);

  return (
    <StudioCard
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
            disabled={generating}
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
