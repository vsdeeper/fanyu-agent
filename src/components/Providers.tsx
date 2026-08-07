'use client';

import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import type { ResolvedThemeMode } from '@/components/theme';
import { ThemedConfigProvider, ThemeProvider } from '@/components/theme';

/** ssrInitialMode：layout 从 cookie 解析出的 SSR 初始主题，供 ThemeProvider 在 hydrated 前使用，避免深色 FOUC */
export default function Providers({
  children,
  ssrInitialMode,
}: {
  children: React.ReactNode;
  ssrInitialMode?: ResolvedThemeMode;
}) {
  return (
    <ThemeProvider ssrInitialMode={ssrInitialMode}>
      <ThemedConfigProvider locale={zhCN}>
        <XProvider>{children}</XProvider>
      </ThemedConfigProvider>
    </ThemeProvider>
  );
}
