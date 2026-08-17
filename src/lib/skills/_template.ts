// 新增 skill 模板（未注册，仅作写法示例；完整真实示例见 brandkit.ts）：
// 1. 复制本文件为新文件（如 my-skill.ts），按需填写；
// 2. 在 registry.ts 的 SKILLS 数组里 import 并加入；
// 3. id 须为 [a-z0-9-]+，与 Suggestion 菜单 value、消息 metadata.skillIds 元素一致；
// 4. instructions 是注入模型的指令正文，会被「令牌原位展开」与「激活集合注入」两处使用。
import type { Skill } from './types';

export const mySkill: Skill = {
  id: 'my-skill',
  name: '示例 Skill',
  description: '一句话说明用途',
  icon: '✨',
  instructions: `按示例约束输出：
- 第一点；
- 第二点。`,
  samplePrompt: '建议 prompt 模板（可选）',
};
