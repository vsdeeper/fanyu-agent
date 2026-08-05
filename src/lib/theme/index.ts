import type { ThemeConfig } from 'antd';
import { seedTokens } from './tokens';
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
