'use client';

import { FileCard } from '@ant-design/x';
import styles from './UserBubbleContent.module.css';

type MessagePart = { type: string; [key: string]: unknown };

export type UserBubbleContentProps = {
  text: string;
  parts: ReadonlyArray<MessagePart> | undefined;
};

function isImageMediaType(mediaType: string): boolean {
  return mediaType.startsWith('image/');
}

function getFileCardType(mediaType: string): 'image' | 'file' {
  return isImageMediaType(mediaType) ? 'image' : 'file';
}

function getFileCardIcon(mediaType: string): 'pdf' | 'word' | 'markdown' | 'default' {
  if (mediaType === 'application/pdf') return 'pdf';
  if (
    mediaType === 'application/msword' ||
    mediaType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return 'word';
  }
  if (mediaType === 'text/markdown' || mediaType === 'text/plain') return 'markdown';
  return 'default';
}

export default function UserBubbleContent({ text, parts }: UserBubbleContentProps) {
  const fileParts = (parts ?? []).filter(
    (part): part is MessagePart & { type: 'file'; url: string; mediaType: string } =>
      part.type === 'file' && typeof part.url === 'string' && typeof part.mediaType === 'string',
  );

  return (
    <div className={styles.root}>
      {fileParts.length > 0 ? (
        <div className={styles.files}>
          {fileParts.map((part, index) => {
            const filename =
              typeof part.filename === 'string' && part.filename.trim()
                ? part.filename
                : `附件 ${index + 1}`;

            if (isImageMediaType(part.mediaType)) {
              return (
                // eslint-disable-next-line @next/next/no-img-element -- 用户消息内联 data URL / blob，无需 next/image
                <img
                  key={`${part.url}-${index}`}
                  className={styles.image}
                  src={part.url}
                  alt={filename}
                />
              );
            }

            return (
              <FileCard
                key={`${part.url}-${index}`}
                name={filename}
                type={getFileCardType(part.mediaType)}
                icon={getFileCardIcon(part.mediaType)}
              />
            );
          })}
        </div>
      ) : null}
      {text ? <div className={styles.text}>{text}</div> : null}
    </div>
  );
}
