import { getSkill } from './registry';

// 修复：id 用 [a-z0-9-]* 而非 [^\s]*，避免把令牌后紧跟的中文/标点也吞进 id（如「/brandkit用暖色」只匹配 /brandkit）。
// 令牌只在行首或空格后（(^|\s)\/），前面紧贴普通文字的 / 不展开。
const SKILL_TOKEN_RE = /(^|\s)\/([a-z0-9-]*)/g;

/**
 * 把用户文本里的 /<skillId> 令牌在原位置展开为 skill 指令块（IDE slash 命令式原位展开），
 * 使模型能感知约束与用户意图的位置对应，而非所有指令堆在系统提示词末尾。
 * - id 在注册表不存在时保留原文，优雅降级；
 * - 同一文本内重复 id：首次展开完整 instructions，后续仅保留短引用 `【Skill：{name}】`；
 * - 可选 `seenIds` 供同一条 user 消息的多个 text part 共享去重状态；
 * - 纯函数、不依赖 AI SDK 消息类型，供 stream-chat 对模型入参副本调用（落盘仍是原文）。
 */
export function expandSkillTokensInText(text: string, seenIds: Set<string> = new Set()): string {
  return text.replace(SKILL_TOKEN_RE, (match, boundary: string, id: string) => {
    const skill = getSkill(id);
    if (!skill) return match;
    if (seenIds.has(id)) {
      return `${boundary}【Skill：${skill.name}】`;
    }
    seenIds.add(id);
    return `${boundary}【Skill：${skill.name}】\n${skill.instructions}`;
  });
}
