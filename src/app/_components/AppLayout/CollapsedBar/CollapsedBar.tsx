import { MenuUnfoldOutlined, PlusOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import styles from './CollapsedBar.module.css';

type CollapsedBarProps = {
  busy: boolean;
  onExpand: () => void;
  onCreateChat: () => void;
};

/**
 * 侧栏收起后的主列快捷条：展开侧栏、开启新对话。
 */
export default function CollapsedBar({ busy, onExpand, onCreateChat }: CollapsedBarProps) {
  return (
    <div className={styles.bar}>
      <div className={`${styles.cluster} ${styles.enter}`} role="toolbar" aria-label="侧栏快捷操作">
        <Button
          type="text"
          icon={<MenuUnfoldOutlined style={{ fontSize: '16px' }} />}
          aria-label="展开侧栏"
          shape="circle"
          variant="filled"
          onClick={onExpand}
        />
        <Button
          type="text"
          icon={<PlusOutlined style={{ fontSize: '16px' }} />}
          aria-label="开启新对话"
          shape="circle"
          variant="filled"
          disabled={busy}
          onClick={onCreateChat}
        />
      </div>
    </div>
  );
}
