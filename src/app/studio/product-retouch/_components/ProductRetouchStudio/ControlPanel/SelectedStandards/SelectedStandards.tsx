import { Image } from 'antd';
import { REFINE_STANDARD_BADGE, SELECTED_STANDARDS_SUBTITLE } from '../../constants';
import styles from './SelectedStandards.module.css';

type SelectedStandardsProps = {
  urls: readonly string[];
};

/** 多视角左栏只读预览：展示已选精修标准图。 */
export default function SelectedStandards({ urls }: SelectedStandardsProps) {
  if (urls.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <span className={styles.label}>{REFINE_STANDARD_BADGE}</span>
        <span className={styles.sub}>{SELECTED_STANDARDS_SUBTITLE}</span>
      </div>
      <Image.PreviewGroup>
        <div className={styles.thumbs}>
          {urls.map((url, index) => (
            <div key={`${index}-${url}`} className={styles.thumb}>
              <Image src={url} alt="精修标准图" preview={{ mask: '预览' }} />
            </div>
          ))}
        </div>
      </Image.PreviewGroup>
    </section>
  );
}
