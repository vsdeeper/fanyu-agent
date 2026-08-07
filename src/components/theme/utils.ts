import {
  DEFAULT_THEME_PREFERENCE,
  THEME_RESOLVED_COOKIE_KEY,
  THEME_STORAGE_KEY,
  type ResolvedThemeMode,
  type ThemeMode,
} from './constants';

/** 系统当前是否偏好深色；SSR/无 matchMedia 时返回 false */
export function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  } catch {
    return false;
  }
}

/** 把用户偏好解析为实际生效主题：'system' 按系统偏好取值，light/dark 原样返回 */
export function resolveMode(pref: ThemeMode): ResolvedThemeMode {
  return pref === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : pref;
}

/**
 * 读取持久化的偏好（localStorage 接受 'light'|'dark'|'system'）；
 * SSR 或缺失/非法时返回 DEFAULT_THEME_PREFERENCE（首访默认跟随系统）。
 */
export function resolveInitialPreference(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    // 隐私模式等场景下 localStorage 不可用
  }
  return DEFAULT_THEME_PREFERENCE;
}

/**
 * 应用主题：html[data-theme] 与 color-scheme 永远写解析后的 light|dark（system 由 resolveMode 解出），
 * localStorage 持久化的是用户偏好（含 'system'）。window 守卫保证 SSR 安全。
 */
export function applyThemeMode(pref: ThemeMode): void {
  if (typeof window === 'undefined') return;
  const resolved = resolveMode(pref);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
    // 服务端读不到 localStorage，把「解析后主题」写入 cookie 供 layout.tsx 做 SSR 初始 antd 主题
    // （存 resolved 而非 preference：'system' 用户的 OS 明暗变化也会随 applyThemeMode 更新 cookie）
    document.cookie = `${THEME_RESOLVED_COOKIE_KEY}=${resolved}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // 忽略隐私模式写入失败
  }
}
