import { FileCard } from '@ant-design/x';
import { Tag } from 'antd';
import { formatSkillTagLabel } from '@/lib/skills/format-tag-label';
import { parseSkillTokensInText } from '@/lib/skills/parse-tokens';
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

function renderMessageText(text: string) {
  const segments = parseSkillTokensInText(text);
  if (segments.length === 1 && segments[0]?.type === 'text') {
    return segments[0].value;
  }

  return segments.map((segment, index) => {
    if (segment.type === 'text') {
      return <span key={`text-${index}`}>{segment.value}</span>;
    }
    const label = formatSkillTagLabel(segment);
    return (
      <Tag key={`skill-${segment.id}-${index}`} className={styles.skillTag} color="processing">
        {label}
      </Tag>
    );
  });
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
      {text ? <div className={styles.text}>{renderMessageText(text)}</div> : null}
    </div>
  );
}
