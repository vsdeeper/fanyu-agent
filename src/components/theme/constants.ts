/** 用户主题偏好：浅色 / 深色 / 跟随系统 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 实际生效主题：始终为 light|dark（system 已按系统偏好解析），供 DOM/antd 消费 */
export type ResolvedThemeMode = 'light' | 'dark';

/** 未保存偏好时的默认值：跟随系统 */
export const DEFAULT_THEME_PREFERENCE: ThemeMode = 'system';

/** 循环切换顺序（浅色→深色→跟随系统→…）：store.toggle 与 ModeSwitch 共用，唯一来源防漂移 */
export const THEME_MODE_CYCLE: readonly ThemeMode[] = ['light', 'dark', 'system'];

/**
 * localStorage 持久化键（存用户偏好，含 'system'）
 * 注意：layout.tsx 的预挂载内联脚本也内联了这个字符串（脚本无法 import），
 * 修改时需两处同步。
 */
export const THEME_STORAGE_KEY = 'one-theme';

/**
 * 服务端 cookie 键（存「解析后主题」light|dark）。
 * 服务端无法读 localStorage，layout.tsx 用它做 SSR 初始 antd 主题，避免深色刷新时浅→深 FOUC；
 * 由 utils.applyThemeMode 在客户端双写：localStorage=preference、cookie=resolved。
 */
export const THEME_RESOLVED_COOKIE_KEY = 'one-theme-resolved';
