import type { ThemeMode } from './constants';
import { applyThemeMode, resolveInitialMode } from './utils';

/**
 * 主题外部 store（配合 useSyncExternalStore 使用）
 * - 模块级 currentMode 占位 'light'：SSR 与首帧一致，无 hydration 不匹配；
 *   React 在 hydration 期间使用 getServerSnapshot（返回该占位值），水合后再取真实值。
 * - 所有写操作集中于此并 notify；DOM/localStorage 副作用委托给 utils.applyThemeMode，
 *   避免在 effect 内同步 setState（react-hooks/set-state-in-effect 会报错）。
 */
let currentMode: ThemeMode = 'light';
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getThemeMode(): ThemeMode {
  return currentMode;
}

export function subscribeThemeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setThemeMode(next: ThemeMode): void {
  if (currentMode === next) return;
  currentMode = next;
  applyThemeMode(next);
  notify();
}

export function toggleThemeMode(): void {
  setThemeMode(currentMode === 'dark' ? 'light' : 'dark');
}

/** 客户端挂载后解析初始模式（localStorage → 系统偏好），并同步 DOM/持久化 */
export function hydrateThemeMode(): void {
  currentMode = resolveInitialMode();
  applyThemeMode(currentMode);
  notify();
}
