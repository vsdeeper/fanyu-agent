'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import type { ResolvedThemeMode } from './constants';
import {
  getHydrated,
  getResolvedMode,
  getThemePreference,
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
 * - 挂载后 hydrateThemeMode 从 localStorage（默认跟随系统）解析真实偏好并 notify；
 * - 两个快照均为原始字符串：mode=实际生效主题，preference=用户选择（含 'system'）；
 * - ssrInitialMode 由 layout 从 cookie 解析传入：SSR 与客户端首帧用它替代 'light' 占位，
 *   使 antd 在 SSR 即输出正确主题 CSS（避免深色模式刷新时的浅→深 FOUC）；
 * - setMode/toggle 直接操作 store（稳定引用），写后由 store 统一通知重渲染。
 */
export default function ThemeProvider({
  children,
  ssrInitialMode,
}: {
  children: ReactNode;
  ssrInitialMode?: ResolvedThemeMode;
}) {
  const mode = useSyncExternalStore(subscribeThemeMode, getResolvedMode, getResolvedMode);
  const preference = useSyncExternalStore(
    subscribeThemeMode,
    getThemePreference,
    getThemePreference,
  );
  const hydrated = useSyncExternalStore(subscribeThemeMode, getHydrated, getHydrated);

  useEffect(() => {
    hydrateThemeMode();
  }, []);

  const value: ThemeContextValue = {
    mode: hydrated ? mode : (ssrInitialMode ?? 'light'),
    preference: hydrated ? preference : (ssrInitialMode ?? 'light'),
    hydrated,
    setMode: setThemeMode,
    toggle: toggleThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
