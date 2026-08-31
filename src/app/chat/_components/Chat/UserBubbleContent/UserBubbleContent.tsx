import { memo } from 'react';
import { Tag } from 'antd';
import { formatSkillTagLabel } from '@/lib/skills/format-tag-label';
import { parseSkillTokensInText } from '@/lib/skills/parse-tokens';
import UserAttachmentList from './UserAttachmentList';
import styles from './UserBubbleContent.module.css';
import {
  isPlainTextOnly,
  userBubbleContentPropsAreEqual,
  type UserBubbleContentProps,
} from './utils';

export type { UserBubbleContentProps };

function UserBubbleContent({ text, parts }: UserBubbleContentProps) {
  const segments = text ? parseSkillTokensInText(text) : [];

  return (
    <div className={styles.root}>
      <UserAttachmentList parts={parts} />
      {text ? (
        <div className={styles.text}>
          {isPlainTextOnly(segments)
            ? segments[0].value
            : segments.map((segment, index) => {
                if (segment.type === 'text') {
                  return <span key={`text-${index}`}>{segment.value}</span>;
                }
                return (
                  <Tag
                    key={`skill-${segment.id}-${index}`}
                    className={styles.skillTag}
                    color="processing"
                    variant="solid"
                  >
                    {formatSkillTagLabel(segment)}
                  </Tag>
                );
              })}
        </div>
      ) : null}
    </div>
  );
}

export default memo(UserBubbleContent, userBubbleContentPropsAreEqual);
