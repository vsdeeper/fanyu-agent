import type { ReactNode } from 'react';
import { App, ConfigProvider, type ConfigProviderProps } from 'antd';
import { bindAntdMessage } from '@/lib/shared/client/antd-message';
import { appTheme, darkTheme } from '@/lib/theme';
import { useThemeMode } from './theme-context';

/** 把 App.useApp 的 message 交给非 React 模块（api-client 等） */
function AntdMessageBridge() {
  const { message } = App.useApp();
  bindAntdMessage(message);
  return null;
}

/**
 * 把主题模式接入 antd ConfigProvider，并包一层 App 让 Toast 跟随动态主题。
 * 顶层组件（勿嵌套在 Provider 组件体内定义，否则每次渲染 remount 整棵子树丢失状态）。
 * 切换 algorithm 时 antd 会在 :root 重新输出暗色 --one-* cssVar，走 token 的样式自动跟随。
 * cssVar 模式下 App 必须渲染真实节点（不能 component={false}），height:100% 把视口高度传给 Layout 壳。
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
      <App style={{ height: '100%' }}>
        <AntdMessageBridge />
        {children}
      </App>
    </ConfigProvider>
  );
}
