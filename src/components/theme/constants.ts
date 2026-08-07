/** 主题模式 */
export type ThemeMode = 'light' | 'dark';

/**
 * localStorage 持久化键
 * 注意：layout.tsx 的预挂载内联脚本也内联了这个字符串（脚本无法 import），
 * 修改时需两处同步。
 */
export const THEME_STORAGE_KEY = 'one-theme';
