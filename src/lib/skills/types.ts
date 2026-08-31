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
   * 为 false 时 Suggestion 菜单不展示、用户文本中的 /<id> 不按令牌展开或激活；
   * 须写在 summaries.ts 的摘要上（catalog 经 spread 继承）。仍可出现在 Discovery 目录，
   * 经意图匹配或 coActivateWith 注入正文（主模型知识库）。
   */
  userInvocable?: boolean;
  /**
   * 服务端意图匹配用触发词（子串命中）。只在 server/catalog 填写，勿写入 summaries，
   * 避免打进浏览器包。
   */
  activationKeywords?: string[];
  /**
   * 当列出的 skill 本轮已激活时，一并注入本 skill 的 instructions。
   * 供 userInvocable: false 的知识库 skill 挂到相关出图 skill 上。
   * 只写在 catalog，勿写入 summaries。
   */
  coActivateWith?: string[];
  /**
   * 本 skill 产出的图片需按类型分组展示（如电商主图/详情图/营销图）。
   * 服务端据「本轮激活的 skill ∩ 声明了分组的 skill」在 generate_image 输出打 imageGrouping 标志，
   * 前端据此启用「横向簇 + 书页叠」渲染。只写在 catalog，勿写入 summaries（不进浏览器包）。
   * 扩展：新 skill 出多类型组合图时，加此字段并要求模型在 generate_image 传 type 即可，无需改 tool/context。
   */
  supportsImageGrouping?: boolean;
  /** 注入模型的指令正文；仅本轮 Activation 时加载（Discovery 只放 name + description） */
  instructions: string;
  /** 可选：建议 prompt 模板（预留，默认不自动填入输入框） */
  samplePrompt?: string;
};

/** 去掉 instructions 的精简视图，仅用于前端菜单展示 */
export type SkillSummary = Pick<Skill, 'id' | 'name' | 'description' | 'icon' | 'userInvocable'>;
