import type { SourceListItem } from '../types';

/** 发布日期展示：YYYY-MM-DD 前缀改为斜杠并丢掉时间；无法解析则原样 */
export function formatPublishDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[1]}/${match[2]}/${match[3]}`;
  return value;
}

/** 卡片无障碍标签：序号 + 标题 */
export function getSourceCardLabel(index: number, item: SourceListItem): string {
  return `${index}. ${item.title}`;
}
