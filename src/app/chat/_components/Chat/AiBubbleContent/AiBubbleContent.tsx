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
import ToolCallBlock from './ToolCallBlock';
import {
  type AiBubbleContentProps,
  aiBubbleContentPropsAreEqual,
  getContentBlocks,
  getDesignMdParts,
  getGenerateImageParts,
  getSourceItems,
  stripReferenceSection,
} from './utils';

export type { AiBubbleContentProps };

function AiBubbleContent({ messageId, text, streaming, messageParts }: AiBubbleContentProps) {
  const { mode } = useThemeMode();
  const sourceItems = useMemo(() => getSourceItems(messageParts, text), [messageParts, text]);
  const imageParts = useMemo(() => getGenerateImageParts(messageParts), [messageParts]);
  const designMdParts = useMemo(() => getDesignMdParts(messageParts), [messageParts]);
  // 按 parts 顺序逐块渲染「思考-正文-思考-正文」；出图 / DESIGN.md 卡片与来源条仍在气泡末尾汇总
  const blocks = useMemo(() => getContentBlocks(messageParts), [messageParts]);
  // 「参考来源」只裁最后一个正文块：模型可能在前面的块里提到该词，逐块裁会误删那句正文
  const lastTextKey = useMemo(
    () => blocks.findLast((block) => block.kind === 'text')?.key,
    [blocks],
  );

  return (
    <div className={styles.bubbleContent}>
      {blocks.map((block) => {
        if (block.kind === 'tool') {
          return <ToolCallBlock key={block.key} part={block.part} />;
        }
        if (block.kind === 'reasoning') {
          return (
            <ReasoningThink key={block.key} thinking={streaming && block.streaming}>
              {block.text}
            </ReasoningThink>
          );
        }
        return (
          <XMarkdown
            key={block.key}
            className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
            content={block.key === lastTextKey ? stripReferenceSection(block.text) : block.text}
            components={markdownComponents}
            paragraphTag="div"
            openLinksInNewTab
            escapeRawHtml
            streaming={{
              hasNextChunk: streaming && block.streaming,
              incompleteMarkdownComponentMap: { image: 'incomplete-image' },
            }}
            disableDefaultStyles={['code', 'img']}
          />
        );
      })}
      {imageParts.length > 0 ? <GenerateImageBlock parts={imageParts} /> : null}
      {designMdParts.length > 0 ? <DesignMdBlock parts={designMdParts} /> : null}
      {sourceItems.length > 0 && !streaming ? (
        <SourceBar messageId={messageId} items={sourceItems} />
      ) : null}
    </div>
  );
}

export default memo(AiBubbleContent, aiBubbleContentPropsAreEqual);
