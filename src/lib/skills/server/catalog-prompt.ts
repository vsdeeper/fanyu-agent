import 'server-only';

import { listSkills } from './registry';

/**
 * 构建 Tier1 Discovery 目录：每轮常驻 name + description，不含 instructions。
 * 完整指令只在本轮 Activation 块注入。
 */
export function buildSkillCatalogPrompt(): string {
  const skills = listSkills();
  if (skills.length === 0) return '';

  const lines = skills.map((skill) => `- ${skill.id}（${skill.name}）：${skill.description}`);

  return [
    '【可用 Skills（知识库目录）】',
    '以下仅列出名称与用途，供判断是否相关。完整指令只在「本轮激活 Skills」块出现；未激活时不要套用其约束，按普通对话回答。',
    '用户可用 /<id> 显式触发；服务端也会按意图匹配自动激活。',
    ...lines,
  ].join('\n');
}
