import { theme, type ThemeConfig } from 'antd';
import { darkSeedTokens, seedTokens } from './tokens';
import { componentTokens } from './components';

/**
 * 应用主题配置
 * 直接传给 ConfigProvider 的 theme 属性
 *
 * cssVar.prefix 设为 'one'，所有 antd 设计 token 以 --one-* 形式注入 :root，
 * CSS Modules 通过 var(--one-color-primary) 等方式引用。
 */
export const appTheme: ThemeConfig = {
  token: seedTokens,
  components: componentTokens,
  // 启用 CSS 变量模式，全局可用 --one-color-primary 等
  cssVar: { prefix: 'one' },
};

/**
 * 暗色主题
 * 与 appTheme 共用同一 cssVar.prefix，切换 algorithm 后 antd 在 :root 重新输出暗色 --one-*，
 * 走 token 的样式（含 @ant-design/x 组件）整体自动换肤。
 */
export const darkTheme: ThemeConfig = {
  ...appTheme,
  algorithm: theme.darkAlgorithm,
  token: darkSeedTokens,
};
