import { memo, useMemo } from 'react';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
// XMarkdown 主题变量覆写层（全局共用）；必须紧跟主题 CSS 之后引入保证覆盖，勿移入 global.css（会被深层主题 CSS 反压失效）
import '@/lib/theme/XMarkdownTheme.css';
import styles from './AiBubbleContent.module.css';
import { useThemeMode } from '@/components/theme';
import DesignMdBlock from './DesignMdBlock';
import GenerateImageBlock from './GenerateImageBlock';
import { markdownComponents } from './MarkdownImage';
import ReasoningThink from './ReasoningThink';
import SourceBar from './SourceBar';
import {
  type AiBubbleContentProps,
  aiBubbleContentPropsAreEqual,
  getDesignMdParts,
  getGenerateImageParts,
  getSourceItems,
  stripReferenceSection,
} from './utils';

export type { AiBubbleContentProps };

function AiBubbleContent({
  messageId,
  text,
  reasoning,
  streaming,
  thinking,
  messageParts,
}: AiBubbleContentProps) {
  const { mode } = useThemeMode();
  const sourceItems = useMemo(() => getSourceItems(messageParts, text), [messageParts, text]);
  const imageParts = useMemo(() => getGenerateImageParts(messageParts), [messageParts]);
  const designMdParts = useMemo(() => getDesignMdParts(messageParts), [messageParts]);
  // 修复：裁切末尾「参考来源」区块后再渲染 Markdown，避免与来源条重复展示
  const displayText = useMemo(() => stripReferenceSection(text), [text]);

  return (
    <div className={styles.bubbleContent}>
      {reasoning ? <ReasoningThink thinking={thinking}>{reasoning}</ReasoningThink> : null}
      {text ? (
        <XMarkdown
          className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
          content={displayText}
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
      {imageParts.length > 0 ? <GenerateImageBlock parts={imageParts} /> : null}
      {designMdParts.length > 0 ? <DesignMdBlock parts={designMdParts} /> : null}
      {sourceItems.length > 0 && !streaming ? (
        <SourceBar messageId={messageId} items={sourceItems} />
      ) : null}
    </div>
  );
}

export default memo(AiBubbleContent, aiBubbleContentPropsAreEqual);
