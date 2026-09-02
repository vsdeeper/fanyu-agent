'use client';

import { WorkspaceProvider } from './context';
import type { AppLayoutProps } from './types';
import WorkspaceShell from './WorkspaceShell';

/**
 * 根 layout 客户端入口：工作区上下文 + 侧栏布局壳。
 */
export default function AppLayout({ chats, children }: AppLayoutProps) {
  return (
    <WorkspaceProvider>
      <WorkspaceShell chats={chats}>{children}</WorkspaceShell>
    </WorkspaceProvider>
  );
}
