'use client';

import { createContext, useContext } from 'react';
import type { ResolvedThemeMode, ThemeMode } from './constants';

export type ThemeContextValue = {
  /** 实际生效主题，始终 light|dark（system 已按系统偏好解析） */
  mode: ResolvedThemeMode;
  /** 用户选择，含 'system' */
  preference: ThemeMode;
  /** 客户端 hydrateThemeMode 是否已执行（此前 preference 为 'light' 占位） */
  hydrated: boolean;
  setMode: (mode: ThemeMode) => void;
  /** 三态循环：light → dark → system → light */
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode 必须在 <ThemeProvider> 内使用');
  return ctx;
}
