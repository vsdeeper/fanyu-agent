import { DesktopOutlined, MoonOutlined, SunOutlined } from '@ant-design/icons';
import type { ComponentType, CSSProperties } from 'react';
import { THEME_MODE_CYCLE, type ThemeMode } from '@/components/theme';

/** 各偏好显示名（用于派生「下一步」动作文案） */
export const MODE_NAME: Record<ThemeMode, string> = {
  light: '浅色模式',
  dark: '深色模式',
  system: '跟随系统',
};

/** 各偏好对应的按钮图标 */
export const MODE_ICON: Record<ThemeMode, ComponentType<{ style?: CSSProperties }>> = {
  light: SunOutlined,
  dark: MoonOutlined,
  system: DesktopOutlined,
};

/** 循环顺序中的下一偏好（与 store.toggle 共用 THEME_MODE_CYCLE，防漂移） */
export function nextMode(pref: ThemeMode): ThemeMode {
  const i = THEME_MODE_CYCLE.indexOf(pref);
  return THEME_MODE_CYCLE[(i + 1) % THEME_MODE_CYCLE.length];
}

/** 「下一步」动作文案，如 light → 「切换到深色模式」 */
export function nextModeLabel(pref: ThemeMode): string {
  return `切换到${MODE_NAME[nextMode(pref)]}`;
}
