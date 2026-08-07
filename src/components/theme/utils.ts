import { THEME_STORAGE_KEY, type ThemeMode } from './constants';

/** SSR 时返回 'light'；客户端依次 localStorage → 系统偏好 → 'light' */
export function resolveInitialMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // 隐私模式等场景下 localStorage 不可用
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 同步 html[data-theme] + color-scheme + 持久化；window 守卫保证 SSR 安全 */
export function applyThemeMode(mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // 忽略隐私模式写入失败
  }
}
