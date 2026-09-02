import 'server-only';

import type { Skill } from '../types';
import { brandkit } from './catalog/brandkit';
import { designMd } from './catalog/design-md';
import { mobileDesign } from './catalog/mobile-design';
import { webDesign } from './catalog/web-design';

// 新增 skill：复制 catalog/_template.ts 为 catalog/<id>.ts 填写（完整示例见 catalog/brandkit.ts），
// 再在 SKILLS 数组 import 追加；菜单摘要同步写入 ../summaries.ts（含 userInvocable）；
// 意图匹配触发词写在 catalog 的 activationKeywords，伴随激活写 coActivateWith，勿放进 summaries。
const SKILLS: Skill[] = [brandkit, mobileDesign, webDesign, designMd];

/** 全部 skill 定义（含指令正文，供服务端注入；含 userInvocable === false 项） */
export function listSkills(): Skill[] {
  return SKILLS;
}

/** 按 id 查 skill；不存在返回 undefined（调用方按「未启用」优雅降级） */
export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id);
}

/**
 * 声明了「按类型分组展示图片」的 skill id 集合。
 * 供本轮激活的 skill 与之求交集，决定 generate_image 输出是否带 imageGrouping 标志。
 */
export function listImageGroupingSkillIds(): Set<string> {
  return new Set(SKILLS.filter((skill) => skill.supportsImageGrouping).map((skill) => skill.id));
}
