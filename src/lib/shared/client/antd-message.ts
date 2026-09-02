import 'client-only';

import type { MessageInstance } from 'antd/es/message/interface';

let messageApi: MessageInstance | undefined;

/**
 * 由根部 App.useApp 注入带主题的 message 实例。
 * 仅供非 React 模块（如 api-client）使用；组件内请直接 App.useApp()。
 */
export function bindAntdMessage(api: MessageInstance): void {
  messageApi = api;
}

/**
 * 已绑定的 antd message。须在 App 子树挂载后调用。
 */
export function getAntdMessage(): MessageInstance {
  if (!messageApi) {
    throw new Error('antd message 尚未就绪');
  }
  return messageApi;
}
