import type { ThemeConfig } from 'antd';

/**
 * 组件级 Token 覆盖
 * 按需取消注释并修改对应的值
 *
 * @ant-design/x 组件 token 亦在此配置，由 ConfigProvider 统一注入
 */
export const componentTokens: ThemeConfig['components'] = {
  // ===== antd Layout 布局 =====
  // 修复：布局壳必须用 antd Layout 组件（ChatShell/ChatSidebar），组件级 token 才会惰性输出
  // 为 --one-layout-* 并注入 .ant-layout-* 规则；若仍用原生 div 布局，以下配置完全不生效。
  Layout: {
    // 默认 bodyBg = colorBgLayout（#f9fafb）会把主内容区变灰，必须显式设回 colorBgBase
    bodyBg: 'var(--one-color-bg-base)',
    // 顶部栏当前无背景（透出主区 colorBgBase），保持透明
    headerBg: 'transparent',
    // 侧栏背景跟随 colorBgLayout：浅色 #f9fafb / 暗色 #0d0d0d
    siderBg: 'var(--one-color-bg-layout)',
    headerHeight: 56, // 接近原 min-height40 + padding20 的实际高度
    headerPadding: '0 24px',
  },
  // ===== @ant-design/x 组件 =====
  // Sender: {
  //   colorBgSlot: 'var(--one-color-bg-layout)',
  // },
  // Conversations: {
  //   creationBgColor: 'var(--one-color-bg-layout)',
  // },
  // ===== antd 基础组件 =====
  // Button: { borderRadius: 8 },
};
