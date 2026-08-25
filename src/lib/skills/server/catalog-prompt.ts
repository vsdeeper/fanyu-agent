import 'server-only';

import { isSkillUserInvocable } from '../summaries';
import type { Skill } from '../types';
import { listSkills } from './registry';

function formatCatalogLine(skill: Skill): string {
  return `- ${skill.id}（${skill.name}）：${skill.description}`;
}

/**
 * 构建 Tier1 Discovery 目录：每轮常驻 name + description，不含 instructions。
 * 完整指令只在本轮 Activation 块注入。
 */
export function buildSkillCatalogPrompt(): string {
  const skills = listSkills();
  if (skills.length === 0) return '';

  const invocable = skills.filter((skill) => isSkillUserInvocable(skill));
  const knowledge = skills.filter((skill) => !isSkillUserInvocable(skill));

  const lines = [
    '【可用 Skills（知识库目录）】',
    '以下仅列出名称与用途，供判断是否相关。完整指令只在「本轮激活 Skills」块出现；未激活时不要套用其约束，按普通对话回答。',
  ];

  if (invocable.length > 0) {
    lines.push(
      '用户可调用（可用 /<id> 显式触发；服务端也会按意图匹配自动激活）：',
      ...invocable.map(formatCatalogLine),
    );
  }

  if (knowledge.length > 0) {
    lines.push(
      '主模型知识库（用户不可从菜单或 /<id> 调用；按意图自动激活，或随相关设计 skill 一并注入。用于按需引导，勿在未激活时套用其正文约束）：',
      ...knowledge.map(formatCatalogLine),
    );
  }

  return lines.join('\n');
}
