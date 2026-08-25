import type { MessagePart } from '../utils';
import DesignMdItem from './DesignMdItem';
import styles from './DesignMdBlock.module.css';

export type DesignMdBlockProps = {
  parts: ReadonlyArray<MessagePart>;
  chatId?: string;
};

export default function DesignMdBlock({ parts, chatId }: DesignMdBlockProps) {
  if (parts.length === 0) return null;

  return (
    <div className={styles.list}>
      {parts.map((part, index) => (
        <DesignMdItem key={`design-md-${index}`} part={part} chatId={chatId} />
      ))}
    </div>
  );
}
