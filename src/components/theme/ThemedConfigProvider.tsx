import type { ReactNode } from 'react';
import { ConfigProvider, type ConfigProviderProps } from 'antd';
import { appTheme, darkTheme } from '@/lib/theme';
import { useThemeMode } from './theme-context';

/**
 * 把主题模式接入 antd ConfigProvider
 * 顶层组件（勿嵌套在 Provider 组件体内定义，否则每次渲染 remount 整棵子树丢失状态）。
 * 切换 algorithm 时 antd 会在 :root 重新输出暗色 --one-* cssVar，走 token 的样式自动跟随。
 */
export default function ThemedConfigProvider({
  locale,
  children,
}: {
  locale: ConfigProviderProps['locale'];
  children: ReactNode;
}) {
  const { mode } = useThemeMode();
  return (
    <ConfigProvider locale={locale} theme={mode === 'dark' ? darkTheme : appTheme}>
      {children}
    </ConfigProvider>
  );
}
