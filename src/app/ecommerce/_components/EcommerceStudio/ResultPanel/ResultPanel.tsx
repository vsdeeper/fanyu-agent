import { StarOutlined } from '@ant-design/icons';
import { EMPTY_RESULT_HINT } from '../constants';
import styles from './ResultPanel.module.css';

/**
 * 生成结果区空态。
 */
export default function ResultPanel() {
  return (
    <section className={styles.panel}>
      <div className={styles.head}>
        <StarOutlined className={styles.star} />
        生成结果
      </div>
      <div className={styles.body}>
        <StarOutlined className={styles.icon} />
        <p className={styles.hint}>{EMPTY_RESULT_HINT}</p>
      </div>
    </section>
  );
}
