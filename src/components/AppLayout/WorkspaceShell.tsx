import { Layout } from 'antd';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import CollapsedBar from './CollapsedBar';
import { useWorkspace } from './context';
import styles from './AppLayout.module.css';
import type { AppLayoutProps } from './types';
import { isHomePath } from './utils';

/**
 * 工作区主壳：左侧 Sidebar + 主列。首页 redirect 时不渲染侧栏。
 */
export default function WorkspaceShell({ chats, children }: AppLayoutProps) {
  const pathname = usePathname();
  const { collapsed, setCollapsed, createChat, busy } = useWorkspace();

  if (isHomePath(pathname)) {
    return children;
  }

  return (
    <Layout hasSider className={styles.shell}>
      <Sidebar chats={chats} />
      <Layout className={styles.main}>
        {collapsed ? (
          <CollapsedBar
            busy={busy}
            onExpand={() => setCollapsed(false)}
            onCreateChat={createChat}
          />
        ) : null}
        <div className={styles.mainBody}>{children}</div>
      </Layout>
    </Layout>
  );
}
