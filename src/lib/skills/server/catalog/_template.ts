// 新增 skill 模板（未注册，仅作写法示例；完整真实示例见 catalog/brandkit.ts）：
// 1. 复制本文件为 catalog/<id>.ts，按需填写；
// 2. 在 ../registry.ts 的 SKILLS 数组里 import 并加入；
// 3. 在 ../../summaries.ts 追加对应 SkillSummary（菜单/气泡用，勿含 instructions）；
// 4. id 须为 [a-z0-9-]+，与 Suggestion 菜单 value、消息 metadata.skillIds 元素一致；
// 5. instructions 是注入模型的指令正文，会被「令牌原位展开」与「激活集合注入」两处使用；
// 6. userInvocable 默认 true；设为 false 时界面菜单不展示（须写在 summaries 摘要上，catalog 经 spread 继承）。
import type { Skill } from '../../types';

export const mySkill: Skill = {
  id: 'my-skill',
  name: '示例 Skill',
  description: '一句话说明用途',
  icon: '✨',
  // userInvocable: false, // 可选：不可被用户从菜单调用
  instructions: `按示例约束输出：
- 第一点；
- 第二点。`,
  samplePrompt: '建议 prompt 模板（可选）',
};
