import { useMemo } from 'react';
import { Typography } from 'antd';
import MessageCopyButton from '../MessageCopyButton';
import SourceBar from '../AiBubbleContent/SourceBar';
import { getSourceItems, stripReferenceSection } from '../AiBubbleContent/utils';
import type { MessagePart } from '../AiBubbleContent/utils';
import styles from './AiBubbleFooter.module.css';

export type AiBubbleFooterProps = {
  messageId: string;
  text: string;
  streaming: boolean;
  stopped: boolean;
  messageParts: ReadonlyArray<MessagePart> | undefined;
};

/** 助手气泡 footer：复制 + 参考来源；可选「已停止」提示。 */
export default function AiBubbleFooter({
  messageId,
  text,
  streaming,
  stopped,
  messageParts,
}: AiBubbleFooterProps) {
  const sourceItems = useMemo(() => getSourceItems(messageParts, text), [messageParts, text]);
  const copyText = useMemo(() => stripReferenceSection(text), [text]);
  const showSourceBar = sourceItems.length > 0 && !streaming;
  const showCopy = Boolean(copyText.trim()) && !streaming;

  if (!showCopy && !showSourceBar && !stopped) return null;

  return (
    <div className={styles.footer}>
      {showSourceBar ? <SourceBar messageId={messageId} items={sourceItems} /> : null}
      {showCopy ? <MessageCopyButton text={copyText} /> : null}
      {stopped ? (
        <Typography.Text type="secondary" className={styles.stoppedHint}>
          这条消息已停止
        </Typography.Text>
      ) : null}
    </div>
  );
}
