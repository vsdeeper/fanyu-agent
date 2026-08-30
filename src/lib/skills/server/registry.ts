import 'server-only';

import type { Skill } from '../types';
import { brandkit } from './catalog/brandkit';
import { designMd } from './catalog/design-md';
import { ecommerceImage } from './catalog/ecommerce-image';
import { mobileDesign } from './catalog/mobile-design';
import { webDesign } from './catalog/web-design';

// 新增 skill：复制 catalog/_template.ts 为 catalog/<id>.ts 填写（完整示例见 catalog/brandkit.ts），
// 再在 SKILLS 数组 import 追加；菜单摘要同步写入 ../summaries.ts（含 userInvocable）；
// 意图匹配触发词写在 catalog 的 activationKeywords，伴随激活写 coActivateWith，勿放进 summaries。
const SKILLS: Skill[] = [brandkit, mobileDesign, webDesign, designMd, ecommerceImage];

/** 全部 skill 定义（含指令正文，供服务端注入；含 userInvocable === false 项） */
export function listSkills(): Skill[] {
  return SKILLS;
}

/** 按 id 查 skill；不存在返回 undefined（调用方按「未启用」优雅降级） */
export function getSkill(id: string): Skill | undefined {
  return SKILLS.find((skill) => skill.id === id);
}
