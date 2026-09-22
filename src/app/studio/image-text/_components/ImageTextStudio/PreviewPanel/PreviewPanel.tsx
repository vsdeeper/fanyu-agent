import { StarOutlined } from '@ant-design/icons';
import { Button, Carousel, Empty } from 'antd';
import { EMPTY_PREVIEW_HINT, PREV_BUTTON } from '../constants';
import type { ImageTextPreviewSlide } from '../types';
import styles from './PreviewPanel.module.css';

type PreviewPanelProps = {
  slides: ImageTextPreviewSlide[];
  /** 内容步固定配文；轮播切图时不变。 */
  caption: string;
  navLoading: boolean;
  onPrev: () => void;
};

/** 手机宽度走马灯：上图轮播，下固定配文。 */
export default function PreviewPanel({ slides, caption, navLoading, onPrev }: PreviewPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined />
        预览
      </div>
      <div className={styles.scroll}>
        {slides.length === 0 ? (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={EMPTY_PREVIEW_HINT} />
        ) : (
          <div className={styles.phone} aria-label="图文手机预览">
            <Carousel arrows dots className={styles.carousel}>
              {slides.map((slide) => (
                <div key={slide.id}>
                  <div className={styles.slide}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img className={styles.image} src={slide.url} alt={slide.title} />
                  </div>
                </div>
              ))}
            </Carousel>
            {caption ? <p className={styles.caption}>{caption}</p> : null}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Button size="large" loading={navLoading} onClick={onPrev}>
          {PREV_BUTTON}
        </Button>
      </div>
    </section>
  );
}
