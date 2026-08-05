'use client';

import { ConfigProvider } from 'antd';
import { XProvider } from '@ant-design/x';
import zhCN from 'antd/locale/zh_CN';
import { appTheme } from '@/lib/theme';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider locale={zhCN} theme={appTheme}>
      <XProvider>{children}</XProvider>
    </ConfigProvider>
  );
}
