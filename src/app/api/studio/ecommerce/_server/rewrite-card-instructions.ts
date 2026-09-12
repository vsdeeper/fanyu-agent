import 'server-only';

import {
  DETAIL_IMAGE_THEMES,
  type DetailImageThemeId,
} from '@/app/api/studio/ecommerce/_shared/detail-image-plan';
import {
  MAIN_IMAGE_SPEC_THEME_ID,
  MAIN_IMAGE_THEMES,
  type MainImageAnalyzeThemeId,
  type MainImageThemeId,
} from '@/app/api/studio/ecommerce/_shared/main-image-plan';
import type { RewriteCardKind } from '@/app/api/studio/ecommerce/_shared/rewrite-card';
import {
  DETAIL_IMAGE_REQUIREMENT_FORMAT,
  DETAIL_IMAGE_REQUIREMENT_SAMPLE,
} from '@/app/api/studio/ecommerce/_shared/detail-image-requirement';
import {
  MAIN_IMAGE_REQUIREMENT_FORMAT,
  MAIN_IMAGE_REQUIREMENT_SAMPLE,
} from '@/app/api/studio/ecommerce/_shared/main-image-requirement';

/** 各屏职责：与详情图分析指令中对应节一致，只注入当前屏。 */
export const DETAIL_IMAGE_THEME_DUTIES: Record<DetailImageThemeId, string> = {
  brand:
    '建立品牌第一印象：定位、气质与可识别符号。中景或半身级产品全貌，不要特写局部，不得写成卖点清单或使用现场。背景须用能承载品牌气质的场景、环境或材质铺陈，禁止单调、纯色背景与空洞留白棚拍。配合简洁文案把品牌 Logo 当设计元素独立呈现于画面（用产品上已有的品牌标识，不能只让它出现在产品机身上），搭配品牌名、定位短句；商业分析确无品牌信息时才可省略。',
  sellingPoint:
    '设计目标聚焦本屏主主张，展示重点须围着同一件事展开。禁止把分析里的卖点清单整段平铺进来。机位须能把该主张看清，可斜侧或微距，不得复用「品牌认知」的定位口号与同一正视全身。',
  detail:
    '材质、工艺、结构或外观特写。必须近景/局部特写，并换一个不同于前两屏的观察角度。不得写成功能机制演示，也不得复用核心卖点的主主张。',
  feature:
    '看见机制如何发生（结构、操作、效果）。主机制不得与「核心卖点」的主主张相同；机位须能看见机制发生（操作角度、出风/结构开口等），不得停在静物正视特写。',
  scene:
    '真实使用现场与情境。必须拉远，产品按使用比例出现在现场中，不得是静物台或纯特写，不得复用前四屏的信息点。',
  reason:
    '收束购买动机与体验结果。不得再罗列功能参数，不得与「使用场景」写成同一现场；产品占比与机位须与前五屏均不同。',
};

/** 各张职责：与主图分析指令中对应节一致，只注入当前张；与详情图同名 themeId 的职责完全不同。 */
export const MAIN_IMAGE_THEME_DUTIES: Record<MainImageAnalyzeThemeId, string> = {
  product:
    '设计目标写第一眼印象；展示重点注重产品在实际场景中的展示，突出产品格调，禁止单调、纯色背景与空洞留白棚拍；配合简洁的文案内容：品牌 Logo 当设计元素融入画面，搭配品牌名、产品名等短文案（商业分析确无品牌信息时才可省略）。产品是画面主角，摆拍呈现、不写使用动作，与「使用场景」的现场互斥。',
  sellingPoint:
    '设计目标聚焦本张主主张，展示重点须围着同一件事展开。禁止把分析里的卖点清单整段平铺进来。拍法须换成能把该主张视觉化的另一空间切片，不得复用产品展示的特写台面。',
  feature:
    '设计目标点出主机制，展示重点写同机制的细节呈现。主机制不得与「核心卖点」的主主张相同。拍法须能看见机制发生（气流、摆动、结构细节），不得复用前两张的空间。',
  scene:
    '设计目标写情境，展示重点写真实使用现场的取景。拍法必须是真实使用现场，不得是静物台或纯特写。',
  value:
    '设计目标写利益，展示重点写体验结果与氛围的呈现，不做说明书罗列。拍法与「使用场景」的现场不得相同。',
};

/**
 * 「规格主图」职责：它不由分析产出，故不在 MAIN_IMAGE_THEME_DUTIES 里 ——
 * 那张表的语义是「与分析指令中的小节逐字对应」，这里只有单副本。
 */
export const MAIN_IMAGE_SPEC_THEME_DUTY =
  '本张用于店铺销售中的自定义规格（分类）主图：按用户给出的规格或分类要求出图，独立于其余五张主题卡的互斥划分——不需要避开其它卡，也不必与它们保持一致。用户未指定规格时，从商业分析 / 产品资料里的属性维度（颜色、尺码、容量、套装、型号等）中挑一个最值得单独出图的维度来写。规格名与数值必须取自资料原文，禁止编造。';

const DETAIL_IMAGE_REWRITE_CARD_BASE_INSTRUCTIONS = `你是电商详情页结构策划。只写当前这一屏的设计目标与展示重点。使用中文简体。

硬性规则：
- 禁止询问、禁止确认门、禁止请用户补充后再写；资料不足时按商业分析合理收束。
- 用户 prompt 含【产品资料】时，品牌、产品名、规格数值等第一手产品事实以【产品资料】为准。
- 禁止调用工具、禁止出图、禁止输出图片链接。
- 不要输出 JSON、代码围栏、表格、引用块、二级标题；不要输出其它屏。
- 不要输出商业分析原文，不要把卖点清单整段抄进来。
- 主题卡不要写色板、字体与整套视觉规范；Logo 只写「是否作为独立设计元素呈现」，不写具体位置；这些由出图环节统一决定。
- 禁止与其它屏重复同一卖点、同一细节、同一场景、同一机位。

只输出当前屏正文。
${DETAIL_IMAGE_REQUIREMENT_FORMAT}

格式样例（仅示意结构，内容须按本屏职责与商业分析重写）：
${DETAIL_IMAGE_REQUIREMENT_SAMPLE}

禁止说明书式参数罗列与广告套话。`;

const MAIN_IMAGE_REWRITE_CARD_BASE_INSTRUCTIONS = `你是电商主图策划。只写当前这一张的设计目标与展示重点。使用中文简体。

硬性规则：
- 禁止询问、禁止确认门、禁止请用户补充后再写；资料不足时按已有的商业分析 / 主图说明 / 产品资料合理收束。
- 用户 prompt 含【产品资料】时，品牌、产品名、规格数值等第一手产品事实以【产品资料】为准。
- 用户 prompt 含【主图说明】时，它是硬约束：本张不得产出与该要求冲突的展示重点。
- 禁止调用工具、禁止出图、禁止输出图片链接。
- 不要输出 JSON、代码围栏、表格、引用块、二级标题；不要输出其它张。
- 不要输出商业分析原文，不要把卖点清单整段抄进来。
- 主题卡不要写色板、字体与整套视觉规范；那些由出图环节统一决定。
- 禁止与其它张重复同一卖点、同一细节、同一场景、同一机位。

只输出当前张正文。
${MAIN_IMAGE_REQUIREMENT_FORMAT}

格式样例（仅示意结构，内容须按本张职责与商业分析重写）：
${MAIN_IMAGE_REQUIREMENT_SAMPLE}

禁止说明书式参数罗列与广告套话。`;

/** 「规格主图」的帮写指令：把「与其它张互斥」换成「独立于其它张」，其余与主图同一条线。 */
const MAIN_IMAGE_SPEC_REWRITE_CARD_BASE_INSTRUCTIONS = `你是电商主图策划。只写「规格主图」这一张的设计目标与展示重点。使用中文简体。

硬性规则：
- 禁止询问、禁止确认门、禁止请用户补充后再写；资料不足时按已有的商业分析 / 主图说明 / 产品资料合理收束。
- 用户 prompt 含【产品资料】时，品牌、产品名、规格数值等第一手产品事实以【产品资料】为准。
- 用户 prompt 含【主图说明】时，它是硬约束：本张不得产出与该要求冲突的展示重点。
- 本张独立于其余五张主题卡：不参与它们的互斥划分，不需要避开其它卡，也不必与它们保持一致；但也不要写出其它张的内容。
- 规格名与数值只能取自资料原文，禁止编造。
- 禁止调用工具、禁止出图、禁止输出图片链接。
- 不要输出 JSON、代码围栏、表格、引用块、二级标题；不要输出其它张。
- 不要输出商业分析原文，不要把卖点清单整段抄进来。
- 本卡不要写色板、字体与整套视觉规范；那些由出图环节统一决定。

只输出当前张正文。
${MAIN_IMAGE_REQUIREMENT_FORMAT}

格式样例（仅示意结构，内容须按本张职责与商业分析重写）：
${MAIN_IMAGE_REQUIREMENT_SAMPLE}

禁止说明书式参数罗列与广告套话。`;

/** 按 themeId 取详情图主题中文标题 */
export function detailThemeTitle(themeId: DetailImageThemeId): string {
  return DETAIL_IMAGE_THEMES.find((theme) => theme.id === themeId)?.title ?? themeId;
}

/** 按 themeId 取主图主题中文标题 */
export function mainImageThemeTitle(themeId: MainImageThemeId): string {
  return MAIN_IMAGE_THEMES.find((theme) => theme.id === themeId)?.title ?? themeId;
}

/**
 * 组装只写当前卡（主图）或当前屏（详情图）的帮写 instructions，含该卡职责。
 */
export function buildRewriteCardInstructions(
  kind: RewriteCardKind,
  themeId: MainImageThemeId | DetailImageThemeId,
): string {
  // kind 与 themeId 的配对由请求 schema（可辨识联合）保证，此处按 kind 取同域职责与标题
  if (kind === 'mainImage') {
    const mainThemeId = themeId as MainImageThemeId;
    // 「规格主图」不参与互斥划分，走独立的一套指令与职责
    if (mainThemeId === MAIN_IMAGE_SPEC_THEME_ID) {
      return [
        MAIN_IMAGE_SPEC_REWRITE_CARD_BASE_INSTRUCTIONS,
        `当前张标题：${mainImageThemeTitle(mainThemeId)}`,
        `本张职责：${MAIN_IMAGE_SPEC_THEME_DUTY}`,
      ].join('\n');
    }
    return [
      MAIN_IMAGE_REWRITE_CARD_BASE_INSTRUCTIONS,
      `当前张标题：${mainImageThemeTitle(mainThemeId)}`,
      `本张职责：${MAIN_IMAGE_THEME_DUTIES[mainThemeId]}`,
    ].join('\n');
  }
  const detailThemeId = themeId as DetailImageThemeId;
  return [
    DETAIL_IMAGE_REWRITE_CARD_BASE_INSTRUCTIONS,
    `当前屏标题：${detailThemeTitle(detailThemeId)}`,
    `本屏职责：${DETAIL_IMAGE_THEME_DUTIES[detailThemeId]}`,
  ].join('\n');
}
