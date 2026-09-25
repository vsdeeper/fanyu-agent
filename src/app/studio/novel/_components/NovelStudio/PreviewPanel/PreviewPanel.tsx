import { CopyOutlined, StarOutlined } from '@ant-design/icons';
import { Button, Empty } from 'antd';
import {
  COPY_BODY_BUTTON,
  EMPTY_PREVIEW_HINT,
  PREV_BUTTON,
  PREVIEW_PANEL_TITLE,
} from '../constants';
import type { PreviewDocument } from '../utils';
import styles from './PreviewPanel.module.css';

type PreviewPanelProps = {
  document: PreviewDocument;
  onPrev: () => void;
  onCopy: () => void;
};

/** 全宽正文预览：无左栏、无手机框；仅章标题与正文段落，可一键复制。 */
export default function PreviewPanel({ document, onPrev, onCopy }: PreviewPanelProps) {
  const hasBody = document.sections.length > 0;

  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        {PREVIEW_PANEL_TITLE}
      </div>
      <div className={styles.scroll}>
        {!hasBody ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_PREVIEW_HINT} />
        ) : (
          <article className={styles.article} aria-label="小说正文预览">
            {document.sections.map((section, sectionIndex) => (
              <div
                key={section.chapterLabel ?? `section-${sectionIndex}`}
                className={styles.section}
              >
                {section.chapterLabel ? (
                  <h2 className={styles.chapterTitle}>{section.chapterLabel}</h2>
                ) : null}
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${sectionIndex}-${paragraphIndex}`} className={styles.paragraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            ))}
          </article>
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
          disabled={!hasBody}
          onClick={onCopy}
        >
          {COPY_BODY_BUTTON}
        </Button>
      </div>
    </section>
  );
}
