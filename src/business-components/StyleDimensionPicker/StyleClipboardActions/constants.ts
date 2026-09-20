import type { StylePayloadError } from '../types';

export const COPY_BUTTON = '复制';
export const PASTE_BUTTON = '粘贴';

export const COPY_SUCCESS = '已复制当前文风';
export const COPY_EMPTY_WARNING = '还没选任何文风卡片，没有可复制的内容';
export const COPY_FAILED = '复制失败，请检查浏览器的剪贴板权限';

export const PASTE_SUCCESS = '已粘贴文风';
export const PASTE_EMPTY_WARNING = '剪贴板是空的';
export const PASTE_FAILED = '读取剪贴板失败，请检查浏览器的剪贴板权限';

export const PASTE_CONFIRM_TITLE = '覆盖当前文风？';
export const PASTE_CONFIRM_DESCRIPTION = '粘贴会替换本任务已选的文风卡片。';
export const PASTE_CONFIRM_OK = '覆盖';
export const PASTE_CONFIRM_CANCEL = '取消';

/** 校验失败原因的文案。每条都要说清「哪不对」，而不是笼统的「数据无效」。 */
export const STYLE_PAYLOAD_ERROR_MESSAGE: Record<StylePayloadError, string> = {
  'invalid-json': '剪贴板内容不是有效的 JSON，请确认复制的是文风数据',
  'invalid-shape': '格式不对，应为「维度 → 卡片 id 数组」构成的文风对象',
  'unknown-card': '含有当前版本没有的文风卡片，可能来自其他版本',
  'axis-conflict': '同一根轴上选了多张卡片，无法粘贴',
  empty: '数据里没有任何文风卡片',
};
