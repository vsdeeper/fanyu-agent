import type { SkillTextSegment } from '@/lib/skills/parse-tokens';

export type MessagePart = { type: string; [key: string]: unknown };

export type UserBubbleContentProps = {
  text: string;
  parts: ReadonlyArray<MessagePart> | undefined;
};

type PlainTextSegment = Extract<SkillTextSegment, { type: 'text' }>;

/**
 * 文本无 skill 令牌时走纯字符串，避免包一层无意义的 span。
 */
export function isPlainTextOnly(segments: SkillTextSegment[]): segments is [PlainTextSegment] {
  return segments.length === 1 && segments[0]?.type === 'text';
}

/**
 * 用户气泡在流式时也会随 bubbleItems 重建；text / parts 引用不变则跳过重渲染。
 */
export function userBubbleContentPropsAreEqual(
  prev: UserBubbleContentProps,
  next: UserBubbleContentProps,
): boolean {
  return prev.text === next.text && prev.parts === next.parts;
}
