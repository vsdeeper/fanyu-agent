/** 用户主题偏好：浅色 / 深色 / 跟随系统 */
export type ThemeMode = 'light' | 'dark' | 'system';

/** 实际生效主题：始终为 light|dark（system 已按系统偏好解析），供 DOM/antd 消费 */
export type ResolvedThemeMode = 'light' | 'dark';

/** 未保存偏好时的默认值：跟随系统 */
export const DEFAULT_THEME_PREFERENCE: ThemeMode = 'system';

/** 循环切换顺序（浅色→深色→跟随系统→…）：store.toggle 与 ModeSwitch 共用，唯一来源防漂移 */
export const THEME_MODE_CYCLE: readonly ThemeMode[] = ['light', 'dark', 'system'];

/**
 * localStorage 持久化键
 * 注意：layout.tsx 的预挂载内联脚本也内联了这个字符串（脚本无法 import），
 * 修改时需两处同步。
 */
export const THEME_STORAGE_KEY = 'one-theme';
