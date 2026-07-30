'use client';

import { memo, useMemo } from 'react';
import { Sources } from '@ant-design/x';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import styles from './AiBubbleContent.module.css';
import GenerateImageBlock from './GenerateImageBlock';
import { markdownComponents } from './MarkdownImage';
import ReasoningThink from './ReasoningThink';
import SourceFavicon from './SourceFavicon';
import {
  type AiBubbleContentProps,
  aiBubbleContentPropsAreEqual,
  getGenerateImageParts,
  getSourceItems,
  openSourceUrl,
} from './utils';

export type { AiBubbleContentProps };

function AiBubbleContent({
  text,
  reasoning,
  streaming,
  thinking,
  messageParts,
}: AiBubbleContentProps) {
  const sourceItems = useMemo(() => getSourceItems(messageParts, text), [messageParts, text]);
  const imageParts = useMemo(() => getGenerateImageParts(messageParts), [messageParts]);

  return (
    <div className={styles.bubbleContent}>
      {reasoning ? <ReasoningThink thinking={thinking}>{reasoning}</ReasoningThink> : null}
      {text ? (
        <XMarkdown
          className={`x-markdown-light ${styles.markdown}`}
          content={text}
          components={markdownComponents}
          paragraphTag="div"
          openLinksInNewTab
          escapeRawHtml
          streaming={{
            hasNextChunk: streaming,
            incompleteMarkdownComponentMap: { image: 'incomplete-image' },
          }}
          disableDefaultStyles={['code', 'img']}
        />
      ) : null}
      <GenerateImageBlock parts={imageParts} />
      {sourceItems.length > 0 && !streaming ? (
        <Sources
          className={styles.sources}
          title={`引用 ${sourceItems.length} 个来源`}
          defaultExpanded={false}
          items={sourceItems.map((item) => ({
            ...item,
            icon: <SourceFavicon url={item.url} />,
          }))}
          onClick={openSourceUrl}
        />
      ) : null}
    </div>
  );
}

export default memo(AiBubbleContent, aiBubbleContentPropsAreEqual);
