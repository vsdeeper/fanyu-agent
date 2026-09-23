import type { ReactNode } from 'react';

/** 对话产品段公共 layout；会话壳在 [[...id]]，管理页不经 ChatShell */
export default function ChatSegmentLayout({ children }: { children: ReactNode }) {
  return children;
}
