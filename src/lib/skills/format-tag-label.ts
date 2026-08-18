import type { SkillSummary } from './types';

/** 输入区 / 气泡 skill tag 展示文案：保留 / 前缀，正文用中文 name（提交仍序列化为 /id） */
export function formatSkillTagLabel(summary: Pick<SkillSummary, 'name' | 'icon'>): string {
  const token = `/${summary.name}`;
  return summary.icon ? `${summary.icon} ${token}` : token;
}
