import { THEME_MODE_CYCLE, type ResolvedThemeMode, type ThemeMode } from './constants';
import { applyThemeMode, resolveInitialPreference, resolveMode } from './utils';

/**
 * 主题外部 store（配合 useSyncExternalStore 使用）
 * - preference：用户选择（light|dark|system），写 localStorage；
 *   resolvedMode：实际生效主题（始终 light|dark），写 html[data-theme]。
 * - 模块级占位 'light'：SSR 与首帧一致，无 hydration 不匹配；
 *   React 在 hydration 期间使用 getServerSnapshot（返回占位值），水合后再取真实值。
 * - 所有写操作集中于此并 notify；DOM/localStorage 副作用委托给 utils.applyThemeMode，
 *   避免在 effect 内同步 setState（react-hooks/set-state-in-effect 会报错）。
 * - preference 为 'system' 时挂载 matchMedia 的 change 监听，系统明暗变化实时更新 resolvedMode。
 */
let currentPreference: ThemeMode = 'light';
let resolvedMode: ResolvedThemeMode = 'light';
let systemMql: MediaQueryList | null = null;
// 客户端 hydrateThemeMode 执行完才为 true：在此之前 preference 是 'light' 占位（SSR/首帧），
// 依赖真实偏好的 UI（如 ModeSwitch 图标）应据此先不渲染，避免刷新时闪现错误图标
let hydrated = false;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * 系统明暗变化回调（必须为稳定的模块级函数：内联函数会与 removeEventListener 失配导致监听泄漏）。
 * 直接改 resolvedMode 并 applyThemeMode，勿调 setThemeMode('system')（相等早退会吞掉变化）。
 */
function handleSystemThemeChange(): void {
  if (currentPreference !== 'system') return;
  const next = resolveMode('system');
  if (next === resolvedMode) return;
  resolvedMode = next;
  applyThemeMode('system');
  notify();
}

/** 幂等同步 matchMedia 监听：进入 system 才挂载，离开即移除并置空引用 */
function syncMediaQueryListener(pref: ThemeMode): void {
  if (typeof window === 'undefined') return;
  if (pref === 'system') {
    if (systemMql === null) {
      systemMql = window.matchMedia('(prefers-color-scheme: dark)');
      systemMql.addEventListener('change', handleSystemThemeChange);
    }
  } else if (systemMql !== null) {
    systemMql.removeEventListener('change', handleSystemThemeChange);
    systemMql = null;
  }
}

export function getThemePreference(): ThemeMode {
  return currentPreference;
}

export function getResolvedMode(): ResolvedThemeMode {
  return resolvedMode;
}

export function getHydrated(): boolean {
  return hydrated;
}

export function subscribeThemeMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setThemeMode(next: ThemeMode): void {
  if (next === currentPreference) return;
  currentPreference = next;
  syncMediaQueryListener(next);
  resolvedMode = resolveMode(next);
  applyThemeMode(next);
  notify();
}

/** 三态循环：light → dark → system → light */
export function toggleThemeMode(): void {
  const i = THEME_MODE_CYCLE.indexOf(currentPreference);
  setThemeMode(THEME_MODE_CYCLE[(i + 1) % THEME_MODE_CYCLE.length]);
}

/** 客户端挂载后解析初始偏好（localStorage → 默认跟随系统），同步监听并应用 DOM/持久化 */
export function hydrateThemeMode(): void {
  currentPreference = resolveInitialPreference();
  syncMediaQueryListener(currentPreference);
  resolvedMode = resolveMode(currentPreference);
  applyThemeMode(currentPreference);
  hydrated = true;
  notify();
}
