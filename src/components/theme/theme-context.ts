'use client';

import { createContext, useContext } from 'react';
import type { ThemeMode } from './constants';

export type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeMode 必须在 <ThemeProvider> 内使用');
  return ctx;
}
