'use client';

import { BulbOutlined, MoonOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import { useThemeMode } from '@/components/theme';

/** 浅色/暗色切换按钮；暗色下显太阳（点击回浅色），浅色下显月亮 */
export default function ModeSwitch() {
  const { mode, toggle } = useThemeMode();
  const isDark = mode === 'dark';

  return (
    <Tooltip title={isDark ? '切换到亮色模式' : '切换到暗色模式'}>
      <Button
        type="text"
        shape="circle"
        aria-label={isDark ? '切换到亮色模式' : '切换到暗色模式'}
        icon={
          isDark ? (
            <BulbOutlined style={{ fontSize: 16 }} />
          ) : (
            <MoonOutlined style={{ fontSize: 16 }} />
          )
        }
        onClick={toggle}
      />
    </Tooltip>
  );
}
