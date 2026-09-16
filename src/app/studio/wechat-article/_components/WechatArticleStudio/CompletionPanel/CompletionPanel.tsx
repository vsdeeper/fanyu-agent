import { CopyOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty, Image, Typography } from 'antd';
import { XMarkdown } from '@ant-design/x-markdown';
import '@ant-design/x-markdown/themes/light.css';
import '@ant-design/x-markdown/themes/dark.css';
import '@/lib/theme/XMarkdownTheme.css';
import { useThemeMode } from '@/components/theme';
import { COPY_ARTICLE_BUTTON, COPY_IMAGE_BUTTON, PREV_BUTTON } from '../constants';
import type { ImageSlot } from '../types';
import styles from './CompletionPanel.module.css';

type CompletionPanelProps = {
  titles?: string[];
  markdown: string;
  imageSlots: ImageSlot[];
  onPrev: () => void;
  onCopyArticle: () => void;
  onCopyImage: (url: string) => void;
};

/** 预览发布物料：一键复制正文；单张复制图片；不提供导出。 */
export default function CompletionPanel({
  titles,
  markdown,
  imageSlots,
  onPrev,
  onCopyArticle,
  onCopyImage,
}: CompletionPanelProps) {
  const { mode, hydrated } = useThemeMode();
  const readyImages = imageSlots.filter((slot) => slot.assetUrl);

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        预览发布物料
      </div>
      <div className={styles.scroll}>
        {!markdown.trim() ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无正文" />
        ) : (
          <>
            {titles?.length ? (
              <>
                <Typography.Title level={5}>标题备选</Typography.Title>
                <ul className={styles.titleList}>
                  {titles.map((title) => (
                    <li key={title}>{title}</li>
                  ))}
                </ul>
              </>
            ) : null}
            <Typography.Title level={5}>正文</Typography.Title>
            {hydrated ? (
              <XMarkdown
                className={`${mode === 'dark' ? 'x-markdown-dark' : 'x-markdown-light'} ${styles.markdown}`}
                content={markdown}
                paragraphTag="div"
                openLinksInNewTab
                escapeRawHtml
              />
            ) : null}
            {readyImages.length ? (
              <>
                <Typography.Title level={5}>配图</Typography.Title>
                <div className={styles.images}>
                  {readyImages.map((slot) => (
                    <div key={slot.id} className={styles.imageCard}>
                      <Image src={slot.assetUrl} alt={slot.id} className={styles.image} />
                      <Button onClick={() => onCopyImage(slot.assetUrl!)}>
                        {COPY_IMAGE_BUTTON}
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </>
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
