import { EDIT_BUTTON } from '@/app/studio/_components/StudioCard/constants';
import StudioCard from '@/app/studio/_components/StudioCard';
import { Button } from 'antd';
import { useState } from 'react';
import {
  POLISH_BUTTON,
  WRITE_BUTTON,
  WRITE_CHAR_COUNT,
  WRITE_UNIT_EMPTY_HINT,
} from '../../../constants';
import { countTextChars, splitWritingParagraphs } from '../../../utils';
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
  const [editing, setEditing] = useState(false);
  const showReadActions = !editing;

  return (
    <StudioCard
      className={styles.writingCard}
      styles={WRITING_CARD_STYLES}
      title={<span className={styles.bodyTitle}>{label}</span>}
      extra={
        <span className={styles.extraRow}>
          <span className={styles.charCount}>{WRITE_CHAR_COUNT(countTextChars(body))}</span>
          {showReadActions && (hasBody || polishing) ? (
            <Button
              type="link"
              size="small"
              className={styles.headerBtn}
              loading={polishing}
              disabled={writeBusy && !polishing}
              onClick={(event) => {
                event.stopPropagation();
                onPolish();
              }}
            >
              {POLISH_BUTTON}
            </Button>
          ) : null}
          {showReadActions && hasBody ? (
            <Button
              type="link"
              size="small"
              className={styles.headerBtn}
              disabled={writeBusy}
              onClick={(event) => {
                event.stopPropagation();
                onCopy();
              }}
            >
              {COPY_BUTTON}
            </Button>
          ) : null}
          {showReadActions && !generating ? (
            <Button
              type="link"
              size="small"
              className={styles.headerBtn}
              disabled={polishing}
              onClick={(event) => {
                event.stopPropagation();
                setEditing(true);
              }}
            >
              {EDIT_BUTTON}
            </Button>
          ) : null}
          <Button
            type="link"
            size="small"
            className={styles.headerBtn}
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
      editing={editing}
      onEditingChange={setEditing}
      value={body}
      onSave={onSave}
      textareaRows={16}
    >
      {hasBody ? (
        <div className={styles.bodyText}>
          {splitWritingParagraphs(body).map((paragraph, index) => (
            <p key={index} className={styles.bodyParagraph}>
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        <p className={styles.emptyHint}>{WRITE_UNIT_EMPTY_HINT}</p>
      )}
    </StudioCard>
  );
}
