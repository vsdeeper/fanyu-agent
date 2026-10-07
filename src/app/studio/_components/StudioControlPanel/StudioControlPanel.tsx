import type { ReactNode } from 'react';
import styles from './StudioControlPanel.module.css';

type StudioControlPanelProps = {
  children: ReactNode;
  /** 底栏主操作；不传则不渲染底栏（如小说写作步） */
  footer?: ReactNode;
};

/** 工作室左栏骨架：固定宽面板、可滚动内容区与可选底栏。 */
export default function StudioControlPanel({ children, footer }: StudioControlPanelProps) {
  return (
    <aside className={styles.panel}>
      <div className={styles.scroll}>{children}</div>
      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </aside>
  );
}

/** 左栏 Form 的配套 class：只清掉 Form.Item 下边距。字段间距由滚动区的 gap 负责。 */
export const studioControlFormClassName = styles.form;
