import { CopyOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import StudioStagePanel from '@/app/studio/_components/StudioStagePanel';
import { useThemeMode } from '@/components/theme';
import AnnotatedMarkdown from '../AnnotatedMarkdown';
import { COPY_ARTICLE_BUTTON, PREV_BUTTON, RESEARCH_SOURCES_TITLE } from '../constants';
import type { ImageSlot } from '../types';
import { draftReferencesListMarkdown, splitDraftBodyAndReferences } from '../utils';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  markdown: string;
  imageSlots: ImageSlot[];
  onPrev: () => void;
  onCopyArticle: () => void;
};

/** 预览：手机宽度真实排版预览（正文内联已出图，无分区标题与配图标注）。 */
export default function CompletionPanel({
  markdown,
  imageSlots,
  onPrev,
  onCopyArticle,
}: CompletionPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const markdownClass = `${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`;
  const { body, referencesSection } = splitDraftBodyAndReferences(markdown);
  const referencesList = draftReferencesListMarkdown(referencesSection);

  return (
    <StudioStagePanel
      variant="preview"
      previewPadding="article"
      head={
        <>
          <StarOutlined />
          预览
        </>
      }
      footer={
        <>
          <Button size="large" onClick={onPrev}>
            {PREV_BUTTON}
          </Button>
          <Button
            size="large"
            type="primary"
            icon={<CopyOutlined />}
            disabled={!markdown.trim()}
            onClick={onCopyArticle}
          >
            {COPY_ARTICLE_BUTTON}
          </Button>
        </>
      }
    >
      {!markdown.trim() ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无正文" />
      ) : (
        <div className={styles.phone} aria-label="长文手机预览">
          {hydrated ? (
            <>
              <AnnotatedMarkdown
                markdown={body}
                markdownClassName={markdownClass}
                imageSlots={imageSlots}
                hideMarkerLabels
              />
              {referencesList ? (
                <div className={styles.references}>
                  <p className={styles.referencesTitle}>{RESEARCH_SOURCES_TITLE}</p>
                  <XMarkdown
                    className={`${markdownClass} ${styles.referencesMarkdown}`}
                    content={referencesList}
                    paragraphTag="div"
                    openLinksInNewTab
                    escapeRawHtml
                  />
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      )}
    </StudioStagePanel>
  );
}
