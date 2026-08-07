'use client';

import { Button, Tooltip } from 'antd';
import { useThemeMode } from '@/components/theme';
import { MODE_ICON, nextModeLabel } from './constants';

/**
 * 浅色/深色/跟随系统 三态循环切换按钮；
 * 图标反映当前偏好（☀/☾/🖥），Tooltip 与 aria-label 描述点击后的下一步动作。
 */
export default function ModeSwitch() {
  const { preference, toggle, hydrated } = useThemeMode();
  const label = nextModeLabel(preference);
  const Icon = MODE_ICON[preference];

  // 刷新时 preference 在 hydrateThemeMode 执行前是 'light' 占位（SSR/首帧），
  // 此时渲染会闪现错误的 SunOutlined；等 hydrate 完成后（hydrated=true）再渲染真实图标
  if (!hydrated) return null;

  return (
    <Tooltip title={label}>
      <Button
        type="text"
        shape="circle"
        aria-label={label}
        icon={<Icon style={{ fontSize: 16 }} />}
        onClick={toggle}
      />
    </Tooltip>
  );
}
