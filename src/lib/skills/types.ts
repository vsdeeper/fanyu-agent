/**
 * 跨域 skill 定义。所有 skill 统一在此域注册（src/lib/skills/），不绑定任何业务域。
 * 菜单摘要在 summaries.ts（可进浏览器包）；指令正文只在 server/catalog，经 server/registry 注入模型。
 */
export type Skill = {
  /** 唯一标识，作为 Suggestion 菜单的 value 与消息 metadata.skillIds 的元素；须为 [a-z0-9-]+ */
  id: string;
  /** 菜单、输入区 / 气泡 tag 与指令块中展示的名称 */
  name: string;
  /** 菜单副标题，一句话说明用途 */
  description: string;
  /** 菜单图标（emoji 或图标名），避免 ReactNode 类型污染可两端 import 的纯数据模块 */
  icon?: string;
  /**
   * 用户是否可在界面调用；默认 true（可省略）。
   * 为 false 时 Suggestion 菜单不展示；须写在 summaries.ts 的摘要上（catalog 经 spread 继承），
   * 历史消息气泡仍可通过 getSkillSummary 解析 tag。
   */
  userInvocable?: boolean;
  /** 注入模型的指令正文；令牌原位展开与激活集合注入都使用它 */
  instructions: string;
  /** 可选：建议 prompt 模板（预留，默认不自动填入输入框） */
  samplePrompt?: string;
};

/** 去掉 instructions 的精简视图，仅用于前端菜单展示 */
export type SkillSummary = Pick<Skill, 'id' | 'name' | 'description' | 'icon' | 'userInvocable'>;
