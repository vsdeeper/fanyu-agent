/** 等待首包时占位 assistant 气泡的 key（submitted 阶段 SDK 尚未追加 assistant 消息） */
export const AWAITING_ASSISTANT_BUBBLE_KEY = '__awaiting-assistant__';

/** 气泡角色布局配置；variant 默认即为 filled，与文档「filled - corner right」一致 */
export const bubbleRole = {
  user: {
    placement: 'end' as const,
    shape: 'corner' as const,
  },
  ai: {
    placement: 'start' as const,
    variant: 'borderless' as const,
  },
};
