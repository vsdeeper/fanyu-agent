import type { ThemeConfig } from 'antd';

/**
 * 组件级 Token 覆盖
 * 按需取消注释并修改对应的值
 *
 * @ant-design/x 组件 token 亦在此配置，由 ConfigProvider 统一注入
 */
export const componentTokens: ThemeConfig['components'] = {
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
