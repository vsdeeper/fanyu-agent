import type { ThemeConfig } from 'antd';

/**
 * 全局主题 Token（种子 + 别名级别）
 * 修改这里即可影响整个应用的视觉风格
 *
 * @see https://ant.design/docs/react/customize-theme-cn#token
 */
export const seedTokens: ThemeConfig['token'] = {
  // ===== 品牌色 =====
  colorPrimary: '#1677ff',

  // ===== 语义色 =====
  colorSuccess: '#52c41a',
  colorWarning: '#faad14',
  colorError: '#ff4d4f',
  colorInfo: '#1677ff',

  // ===== 背景 / 前景（由 cssVar 生成 --one-color-bg-base / --one-color-text-base 等，供 body 与侧栏引用）=====
  colorBgBase: '#ffffff',
  colorTextBase: '#141414',
  colorBgLayout: '#f9fafb', // 侧栏背景；原 ChatSidebar 局部变量 --color-bg-container

  // ===== 圆角 =====
  borderRadius: 6,

  // ===== 字号 / 字体 =====
  fontSize: 14,
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",

  // ===== 控件尺寸 =====
  controlHeight: 32,
  sizeUnit: 4,
  sizeStep: 4,

  // ===== 动效 =====
  motion: true,
};
