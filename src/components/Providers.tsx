'use client';

import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import { ThemedConfigProvider, ThemeProvider } from '@/components/theme';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <ThemedConfigProvider locale={zhCN}>
        <XProvider>{children}</XProvider>
      </ThemedConfigProvider>
    </ThemeProvider>
  );
}
