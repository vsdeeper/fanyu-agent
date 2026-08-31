import SourceFavicon, { getSiteName, isHttpUrl } from '@/app/chat/_components/SourceFavicon';
import type { SourceListItem } from '../types';
import { formatPublishDate, getSourceCardLabel } from './utils';
import styles from './SourceList.module.css';

export type SourceListProps = {
  items: ReadonlyArray<SourceListItem>;
};

/** 右侧来源概要：http(s) 整卡可点，新标签打开对应网页 */
export default function SourceList({ items }: SourceListProps) {
  return (
    <div className={styles.list}>
      {items.map((item, index) => {
        const order = index + 1;
        const siteName = getSiteName(item.url);
        const date = item.publishDate ? formatPublishDate(item.publishDate) : '';
        const clickable = isHttpUrl(item.url);
        const label = getSourceCardLabel(order, item);
        const body = (
          <>
            <div className={styles.meta}>
              <span className={styles.site}>
                <SourceFavicon url={item.url} circle />
                <span className={styles.siteName}>{siteName}</span>
                {date ? <span className={styles.date}>{date}</span> : null}
              </span>
              <span className={styles.index}>{order}</span>
            </div>
            <div className={styles.title}>{item.title}</div>
            {item.snippet ? <div className={styles.snippet}>{item.snippet}</div> : null}
          </>
        );

        if (clickable) {
          return (
            <a
              key={item.key}
              className={styles.card}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
            >
              {body}
            </a>
          );
        }

        return (
          <div key={item.key} className={`${styles.card} ${styles.cardStatic}`} aria-label={label}>
            {body}
          </div>
        );
      })}
    </div>
  );
}
