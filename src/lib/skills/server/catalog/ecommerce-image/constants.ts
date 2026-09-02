/** 各平台要求的主图张数；生成清单「平台」行与「未指定则按平台张数」共用 */
export const MAIN_PLATFORM_COUNTS = [
  { label: '淘宝/天猫', count: 5 },
  { label: '京东', count: 10 },
  { label: '拼多多', count: 10 },
  { label: '抖音', count: 5 },
  { label: '小红书', count: 9 },
] as const;

/** 主图本轮张数上限（覆盖各平台要求；超出则本轮先出满并提示下轮补齐） */
export const MAIN_ROUND_LIMIT = 10;

/** 主图画幅（generate_image.aspectRatio） */
export const MAIN_ASPECT_RATIO = '1:1';

/** 主图默认分辨率档位 */
export const MAIN_DEFAULT_RESOLUTION = '2K';

type MainSlot = {
  title: string;
  hint?: string;
};

/** 主图默认槽位（N 不足截取前 N 张，N 更大按序补全；用户指定顺序以用户为准） */
export const MAIN_DEFAULT_SLOTS: readonly MainSlot[] = [
  { title: '吸引点击', hint: '核心卖点，干净高对比' },
  { title: '强化卖点', hint: '细节/材质特写+卖点短句' },
  { title: '场景带入', hint: '真实使用场景' },
  { title: '利益证明', hint: '使用感受/对比/人群契合' },
  { title: '认知底图/规格', hint: '浅底居中+规格' },
  { title: '第二场景/第二人群' },
  { title: '配件/组合/容量' },
  { title: '尺寸对比/细节补充' },
  { title: '信任背书/卖点回顾' },
  { title: '收口浅底/全貌', hint: '与第 5 张区分：一静物一规格，或一正一侧面；须入字' },
];

/** 确认门 A：产品分析之后（当前固定进入主图样张；日后按类型分流时再改文案） */
export const GATE_A =
  '以上产品分析可调整；确认后我将先生成 1 张主图样张供你确认（下一步：出主图样张）。请确认或提出修改。';

/** 确认门 B：主图样张之后 */
export const GATE_B =
  '这张样张的风格将作为整组主图的定板风格（色板/色温/氛围/构图语言）；确认后我将据此输出生成清单与主图规划（下一步：输出生成清单 + 主图规划）。请确认或提出修改；也可重生成或调整样张。';

/** 确认门 C：生成清单 + 主图规划之后 */
export const GATE_C =
  '以上生成清单与主图规划可调整；确认后我将按规划生成整组主图（下一步：生成系列图）。请确认或提出修改。';

/**
 * 每次 generate_image 的 prompt 末尾须写明的字面硬约束。
 * skill 指令要求模型写入；服务端出站守卫再追加同款片段，避免主模型漏写。
 */
export const PROMPT_HARD_CONSTRAINTS =
  '主标题字高≤画面高约1/6，整段文字总高≤画面高约40%，文字不压产品主体，四周留白≥5%；画面四边四角为连续场景，禁空占位色块/圆角底板框/未填内容的徽章或二维码框';

/** 把平台张数拼成清单里的「淘宝/天猫 5 · 京东 10 …」提示 */
export function formatMainPlatformCountHint(): string {
  return MAIN_PLATFORM_COUNTS.map((platform) => `${platform.label} ${platform.count}`).join(' · ');
}

/** 把默认槽位拼成「第 1 张…第 10 张」规划说明 */
export function formatMainSlotDefaults(): string {
  return MAIN_DEFAULT_SLOTS.map((slot, index) => {
    const head = `第 ${index + 1} 张${slot.title}`;
    return slot.hint ? `${head}（${slot.hint}）` : head;
  }).join('；');
}
