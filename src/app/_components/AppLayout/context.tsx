import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CHAT_DRAFT_PATH } from './constants';
import type { WorkspaceContextValue } from './types';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

/**
 * 工作区上下文：侧栏折叠、「开启新对话」、首条发送后的列表锚定。
 * 由根 layout 的 AppLayout 提供，ChatShell 只消费、不反向依赖 Sidebar。
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [collapsed, setCollapsed] = useState(false);
  const [anchorChatId, setAnchorChatId] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const newDraftHandlerRef = useRef<(() => void) | null>(null);

  const registerNewDraftHandler = useCallback((handler: (() => void) | null) => {
    newDraftHandlerRef.current = handler;
  }, []);

  const createChat = useCallback(() => {
    if (busy) return;
    setBusy(true);
    try {
      newDraftHandlerRef.current?.();
      if (pathname !== CHAT_DRAFT_PATH) {
        startTransition(() => {
          router.push(CHAT_DRAFT_PATH);
          router.refresh();
        });
      }
    } finally {
      setBusy(false);
    }
  }, [busy, pathname, router, startTransition]);

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      collapsed,
      setCollapsed,
      createChat,
      registerNewDraftHandler,
      anchorChatId,
      setAnchorChatId,
      busy,
    }),
    [collapsed, createChat, registerNewDraftHandler, anchorChatId, busy],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

/** 读取工作区上下文；必须在 WorkspaceProvider 内 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace 必须在 WorkspaceProvider 内使用');
  }
  return context;
}
