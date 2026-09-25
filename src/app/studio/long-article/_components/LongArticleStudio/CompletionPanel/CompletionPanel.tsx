import { CopyOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useThemeMode } from '@/components/theme';
import AnnotatedMarkdown from '../AnnotatedMarkdown';
import { COPY_ARTICLE_BUTTON, PREV_BUTTON } from '../constants';
import type { ImageSlot } from '../types';
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

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        预览
      </div>
      <div className={styles.scroll}>
        {!markdown.trim() ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无正文" />
        ) : (
          <div className={styles.phone} aria-label="长文手机预览">
            {hydrated ? (
              <AnnotatedMarkdown
                markdown={markdown}
                markdownClassName={markdownClass}
                imageSlots={imageSlots}
                hideMarkerLabels
              />
            ) : null}
          </div>
        )}
      </div>
      <div className={styles.footer}>
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
      </div>
    </section>
  );
}
