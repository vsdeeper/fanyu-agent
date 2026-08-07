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
