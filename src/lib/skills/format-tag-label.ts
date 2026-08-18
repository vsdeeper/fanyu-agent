import type { SkillSummary } from './types';

/** 输入区 / 气泡 skill tag 展示文案：与 slash 令牌一致，保留 / 前缀 + id */
export function formatSkillTagLabel(summary: Pick<SkillSummary, 'id' | 'icon'>): string {
  const token = `/${summary.id}`;
  return summary.icon ? `${summary.icon} ${token}` : token;
}
