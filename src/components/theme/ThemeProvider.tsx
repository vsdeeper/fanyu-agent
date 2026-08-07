'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import {
  getThemeMode,
  hydrateThemeMode,
  setThemeMode,
  subscribeThemeMode,
  toggleThemeMode,
} from './store';
import { ThemeContext, type ThemeContextValue } from './theme-context';

/**
 * 主题状态 Provider
 * 用 useSyncExternalStore 接管外部模式状态，避免在 effect 内同步 setState：
 * - getServerSnapshot 返回 'light' 占位，SSR/首帧与客户端一致，无 hydration 不匹配；
 * - 挂载后 hydrateThemeMode 从 localStorage/系统偏好解析真实模式并 notify；
 * - setMode/toggle 直接操作 store（稳定引用），写后由 store 统一通知重渲染。
 */
export default function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribeThemeMode, getThemeMode, getThemeMode);

  useEffect(() => {
    hydrateThemeMode();
  }, []);

  const value: ThemeContextValue = { mode, setMode: setThemeMode, toggle: toggleThemeMode };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
