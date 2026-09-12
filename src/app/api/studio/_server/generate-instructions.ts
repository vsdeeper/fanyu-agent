import 'server-only';

import {
  DETAIL_IMAGE_CONTINUITY_PROMPT,
  DETAIL_IMAGE_COPY_TYPOGRAPHY_PROMPT,
  DETAIL_IMAGE_FRAMING_PROMPT,
  TASK_TYPE_PROMPT_BY_TYPE,
  MAIN_IMAGE_BRAND_LOGO_PROMPT,
  MAIN_IMAGE_COPY_REFERENCE_PROMPT,
  MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT,
  MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT,
  MARKETING_COPY_TYPOGRAPHY_PROMPT,
  PRODUCT_FIDELITY_NO_REFERENCE_PROMPT,
  PRODUCT_FIDELITY_PROMPT_GUARD,
  PRODUCT_PLACEMENT_PROMPT_GUARD,
  PRODUCT_REFINE_FIDELITY_PROMPT_GUARD,
  PRODUCT_SCALE_PROMPT_GUARD,
  VISUAL_AD_PROMPT_GUARD,
} from './constants';

/**
 * 产品精修出站 prompt：每张原图独立精修一张；以用户要求为主体，并锁定同批背景与产品保真底线。
 * `batchSize` 为本批原图张数。
 */
export function buildProductRefinePrompt(refineRequirement: string, batchSize = 1): string {
  const batchRule =
    batchSize > 1
      ? `本批共 ${batchSize} 张原图，当前参考图只对应其中一张：生成恰好一张精修图，保持该原图的拍摄角度、构图与产品朝向。`
      : '当前参考图就是待精修的原图：生成恰好一张精修图，保持该原图的拍摄角度、构图与产品朝向。';
  return [
    batchRule,
    '【精修要求】',
    refineRequirement.trim(),
    PRODUCT_REFINE_FIDELITY_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 产品多视角出站 prompt：以已选精修标准图锁定同一产品，并按用户要求生成单张视图板。
 */
export function buildProductMultiviewPrompt(multiviewRequirement: string): string {
  return [
    '生成恰好一张电商产品多视角视图板，不要拆成多张图。',
    '已选精修标准图均为同一产品的事实依据：第1张锁定外观、颜色、比例、结构、材质与细节；其余各张补充该产品其它可见角度与细节，不得混合不同 SKU。',
    '【多视角要求】',
    multiviewRequirement.trim(),
    PRODUCT_FIDELITY_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 产品多视角出站 prompt：参考图已是产品精修图，只从同一精修基准生成单张视图板。
 */
export function buildProductViewPrompt(): string {
  return [
    '生成恰好一张电商产品多视角视图板，不要拆成多张图。',
    '参考图均为已精修的同一产品事实依据：第1张锁定外观、颜色、比例、结构、材质与细节；其余各张补充该产品其它可见角度与细节，不得混合不同 SKU。',
    '保持产品外观完全一致，在同一画幅内生成产品正面、侧面、背面、45度、俯视、仰视等多个角度。',
    '使用纯色背景和统一光线，各视角产品比例一致；不要添加无关道具或营销装饰。',
    PRODUCT_FIDELITY_PROMPT_GUARD,
  ].join('\n');
}

/** `buildMainImagePrompt` 入参：尾部可选值同型，一律走具名键，避免位置传错后只静默串值。 */
export type MainImagePromptInput = {
  /** 本张主题卡正文 */
  requirement: string;
  /** 商业分析正文 */
  analysisText: string;
  /** 产品精修图张数（不含文案标准参考图与品牌 Logo） */
  productImageCount: number;
  hasCopyReference: boolean;
  hasBrandLogo: boolean;
  productDocumentsText?: string;
};

/**
 * 电商主图出站 prompt：商业分析定整套气质，可选产品资料定第一手产品事实，本张主题卡定文案与拍法；精修图为产品事实。
 *
 * `productImageCount` / `hasCopyReference` / `hasBrandLogo` 必填：参考图数组顺序为
 * 产品精修图 → 文案标准参考图 → 品牌 Logo，必须按真实张数点名序号，否则默认那句
 * 「其余参考图仅补充同一产品的可见角度」会把后两张图误当成同一产品的另一角度。
 * 产品精修图非必填：`productImageCount === 0` 时没有产品角度可言，产品图那句与产品保真底线都要换成无参考图的说法。
 */
export function buildMainImagePrompt(input: MainImagePromptInput): string {
  const { productImageCount, hasCopyReference, hasBrandLogo } = input;
  const analysisText = input.analysisText.trim();
  const productDocsText = input.productDocumentsText?.trim();
  const hasProductReference = productImageCount > 0;
  const productRange =
    productImageCount <= 1 ? '第1个参考图' : `第1至第${productImageCount}个参考图`;
  // 序号按参考图数组的真实位置算，不能用 max(1, P) 兜底：P=0 时文案标准参考图就是第 1 张
  const copyReferenceIndex = productImageCount + 1;
  // Logo 排在文案标准参考图之后
  const logoReferenceIndex = copyReferenceIndex + (hasCopyReference ? 1 : 0);
  const productRule = !hasProductReference
    ? '本张没有产品精修图参考：产品本体按【本张主题卡】与【产品资料】的描述呈现，不得臆造品牌、规格、结构或资料未提及的细节。'
    : hasCopyReference || hasBrandLogo
      ? productImageCount <= 1
        ? '第1个参考图=用户上传的产品精修图，定义产品本体；本张只有这一张产品图，没有其它产品角度参考。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。'
        : `${productRange}=用户上传的产品精修图，定义产品本体；该范围内的图都属于同一产品，仅补充其可见角度与细节，不得混合不同 SKU。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。`
      : '第1个参考图=用户上传的产品精修图，定义产品本体；其余参考图仅补充同一产品的可见角度与细节，不得混合不同 SKU。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。';
  const referenceRules = [
    productRule,
    ...(hasCopyReference
      ? [
          `第${copyReferenceIndex}个参考图（即【文案标准参考图】）=已生成并被用户点选的主图成品，只作画面文案的字体与文案配色标准，不作任何画面内容依据。`,
          MAIN_IMAGE_COPY_REFERENCE_PROMPT,
        ]
      : []),
    ...(hasBrandLogo
      ? [
          `第${logoReferenceIndex}个参考图（即【品牌 Logo】）=用户上传的品牌 Logo 原图，是画面中品牌标识的呈现依据。`,
          MAIN_IMAGE_BRAND_LOGO_PROMPT,
        ]
      : []),
  ];
  return [
    '生成恰好一张电商主图，不要输出说明、草图或多方案拼图。',
    ...referenceRules,
    '产品底座必须贴实支撑面：四边接触、接触阴影贴边连续，禁止腾空、半边离地或阴影与底座分离；主图不允许悬浮创意。',
    '根据【商业分析】确定整套配色、光影气质、材质与品牌氛围；本张空间、道具、机位与构图切片以【本张主题卡】的展示重点为准。',
    '本张出现的画面文案只来自【本张主题卡】设计目标可转化的短句与展示重点，禁止把拍摄写法说明当文字写进画面。',
    '禁止把空洞白底棚拍或同一套通用生活方式模板当作所有主题的默认背景；套图之间构图与场景须按各自展示重点区分。',
    '【商业分析】',
    analysisText,
    ...(productDocsText
      ? [
          '【产品资料】',
          productDocsText,
          '品牌、产品名与规格数值等第一手产品事实以【产品资料】为准，缺失时以【商业分析】为准。',
        ]
      : []),
    '【本张主题卡】',
    input.requirement.trim(),
    hasCopyReference
      ? MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT
      : MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT,
    VISUAL_AD_PROMPT_GUARD,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    // 无产品参考图时「第1个参考图定义产品本体」无从对位，换成按描述呈现 + 跨张一致的说法
    hasProductReference ? PRODUCT_FIDELITY_PROMPT_GUARD : PRODUCT_FIDELITY_NO_REFERENCE_PROMPT,
  ].join('\n');
}

/**
 * 电商详情图出站 prompt：商业分析定整套气质，可选产品资料定第一手产品事实，当前屏主题卡定本张内容；精修图为产品事实。
 */
export function buildDetailImagePrompt(
  requirement: string,
  analysisText: string,
  productImageCount: number,
  hasPreviousScreen: boolean,
  productDocumentsText?: string,
): string {
  const productDocsText = productDocumentsText?.trim();
  const productRange =
    productImageCount <= 1 ? '第1个参考图' : `第1至第${productImageCount}个参考图`;
  const previousIndex = Math.max(1, productImageCount) + 1;
  const referenceRules = [
    `${productRange}=用户上传的产品精修图，定义产品本体外观、颜色、材质与结构；不得把精修图的拍摄角度、取景远近或产品占画面大小复制到本屏。其余精修图仅补充同一产品的其它可见角度与细节，供本屏按展示重点选用合适机位，不得混合不同 SKU。产品外观、颜色、结构、材质与细节如下方产品保真底线为准。`,
    ...(hasPreviousScreen
      ? [
          `第${previousIndex}个参考图=上一屏详情图，只锁定整套详情页的视觉语言，不是当前屏要复制的构图、主题或产品机位。`,
          DETAIL_IMAGE_CONTINUITY_PROMPT,
          '上一屏只作风格参考，画面信息、构图切片、文案以及产品角度/远近/占比必须按【当前屏主题卡】重新设计，禁止复刻上一屏版式、卖点或同一产品机位。',
        ]
      : []),
  ];

  return [
    '生成恰好一张电商详情页当前屏，不要输出说明、草图或多方案拼图。',
    ...referenceRules,
    '根据【商业分析】确定整套配色、光影气质、材质与品牌氛围。',
    '本张画面信息、文案、产品机位（角度/远近/占比）与构图切片只来自【当前屏主题卡】的设计目标与展示重点。',
    '【商业分析】',
    analysisText.trim(),
    ...(productDocsText
      ? [
          '【产品资料】',
          productDocsText,
          '品牌、产品名与规格数值等第一手产品事实以【产品资料】为准，缺失时以【商业分析】为准。',
        ]
      : []),
    '【当前屏主题卡】',
    requirement.trim(),
    DETAIL_IMAGE_FRAMING_PROMPT,
    DETAIL_IMAGE_COPY_TYPOGRAPHY_PROMPT,
    VISUAL_AD_PROMPT_GUARD,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    PRODUCT_FIDELITY_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 营销主视觉出站 prompt：商业分析为内容依据，上传的全部产品图为改图参考。
 */
export function buildVisualPrompt(analysisText: string): string {
  return [
    '生成一张电商营销主视觉图，作为后续所有设计物料的统一视觉标准。',
    '第1个参考图=用户上传的产品图，定义产品本体；其余参考图仅补充同一产品的可见角度与细节，不得混合不同 SKU。主视觉只输出一张完整广告图。',
    '根据商业分析确定整体配色、场景、光影、构图、品牌氛围与视觉风格。',
    '画面突出产品主体，具有商业广告品质；一张图一个主焦点。',
    '【商业分析】',
    analysisText.trim(),
    MARKETING_COPY_TYPOGRAPHY_PROMPT,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    PRODUCT_FIDELITY_PROMPT_GUARD,
    VISUAL_AD_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 视觉设计出站 prompt：以分析和任务类型定目标，产品标准图定产品，主视觉定风格，可选图补充模特身份。
 */
export function buildDesignPrompt(
  taskType: string,
  analysisText: string,
  includeModel: boolean,
): string {
  const referenceRules = [
    '第1个参考图=用户上传的产品图，定义产品本体；其余参考图仅补充同一产品的可见角度与细节，不得混合不同 SKU。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。',
    '第2个参考图=已选营销主视觉，用于延续配色、光影、品牌氛围与视觉语言，不要求照搬原构图。',
    ...(includeModel
      ? [
          '第3个及之后的参考图=同一位模特的身份与着装参考，必须把该人物融合进成品画面并参与构图，不得省略人物或换成别人。',
          '锁定性别、五官、脸型、肤色、发型、气质，以及服装款式、颜色、材质与关键服饰细节。',
          '姿势、站位、动作与取景可按当前物料的广告设计需要调整，不必照搬参考图。',
        ]
      : ['未带入模特参考图：除非物料表达确有必要，否则不要凭空加入人物。']),
  ];

  return [
    `生成恰好一张“${taskType}”视觉设计成品，不要输出说明、草图或多方案拼图。`,
    ...(TASK_TYPE_PROMPT_BY_TYPE[taskType] ? [TASK_TYPE_PROMPT_BY_TYPE[taskType]] : []),
    ...(taskType === '营销海报' && includeModel
      ? [
          '上传了模特参考后，该人物必须出现在海报中，与产品、场景、光影和文案自然融为一体；不得只拍产品而把人物裁掉，也不得做成与画面割裂的贴图。',
        ]
      : []),
    ...referenceRules,
    '根据商业分析确定目标人群、卖点优先级、品牌调性、使用场景与信息层级；最终画面须是可直接评审的完整设计成品。',
    MARKETING_COPY_TYPOGRAPHY_PROMPT,
    '【商业分析】',
    analysisText.trim(),
    VISUAL_AD_PROMPT_GUARD,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    PRODUCT_FIDELITY_PROMPT_GUARD,
  ].join('\n');
}

/**
 * 独立产品模特 prompt：产品图定品类与整体气质，可选模特图只锁定人物身份。
 */
export function buildProductModelPrompt(
  viewRequirement: string,
  productImageCount: number,
  hasPortrait: boolean,
): string {
  const productRange =
    productImageCount === 1 ? '第1个参考图' : `第1至第${productImageCount}个参考图`;
  const portraitRule = hasPortrait
    ? [
        `第${productImageCount + 1}个及之后的参考图=同一位模特的身份参考照片。`,
        '综合这些照片锁定并补全人物的性别、五官、脸型、肤色、发型与气质；全部视角必须保持同一人物。',
        '模特参考照片仅用于人物身份与外貌，不得沿用其姿态、动作、身体朝向、拍摄角度、取景、服装或构图。',
      ].join('\n')
    : '未提供模特身份参考图：根据产品的目标人群、视觉气质与风格自动匹配中国模特（东亚面孔、自然妆发），全部视角保持同一人物。';

  return [
    '生成恰好一张电商产品模特 lookbook 拼图，不要拆成多张图，不要输出说明。',
    `${productRange}=同一产品的事实参考，用于识别产品品类，并决定模特的视觉、气质、造型、配色、光影与整体风格。`,
    '须先根据产品图判断产品是否属于可穿戴品类，再严格二选一执行：',
    '- 可穿戴品类（服装、鞋帽、箱包、配饰、首饰等）：模特须正确穿戴参考产品，各视角清晰展示穿着效果与版型细节；产品外观、颜色、比例、结构、材质、纹理、Logo 与关键识别细节须忠于参考图。',
    '- 非可穿戴品类（家电、数码、美妆瓶罐、食品等）：画面中不得出现产品本体；模特不得持用、触碰、操作或演示产品，只通过造型、配色、光影与气质呼应产品风格。',
    portraitRule,
    '人物商业级修饰硬约束（与构图硬约束同级）：参考图仅用于锁定可识别的身份特征（性别、五官结构与比例、脸型、发色发长与轮廓、肤色基调整体气质）；最终人物须保留这些可辨特征，但不得复刻参考图这张照片上的模糊、瑕疵、油光、杂发或随意妆造，须按商业电商目录标准做精细化修饰——整体画面清晰锐利，皮肤匀净细腻、去除明显瑕疵与油光，发丝发际整齐，五官轮廓精致，表情自然；人物保持真实可辨识，勿修成失真变形或千篇一律的美颜脸。',
    '整体干净简洁，造型、妆发、场景与画面元素克制；浅灰或白色无缝影棚背景，均匀柔光，模特旁边、身后和手里不得出现无关杂物或道具。',
    '构图硬约束（优先级高于下方补充要求）：只允许单行四栏横向拼图。左侧约占总宽度40%，使用一张从顶部贯通到底部的胸以上正面半身特写；右侧约占总宽度60%，平均切分为三个从顶部贯通到底部的等宽竖栏，从左到右严格依次为正视、侧视、背视全身站姿。',
    '左栏半身特写姿态硬约束（与构图硬约束同级，贯穿四格生成全过程）：人物必须正对镜头、头部端正、双眼平视前方，双肩保持水平且左右对称，躯干保持直立，不得侧身、转体、歪头、仰头、低头或耸肩；采用人眼高度平视机位，正面居中构图，身体中轴线与画面垂直。',
    '人体完整性硬约束：先分别生成四张解剖结构正确、自然完整的人像，再按上述栏位等比缩放拼合；禁止为塞入窄栏而横向压扁、拉伸、扭曲身体。三个全身栏均须完整保留头顶至鞋底并留少量边距，头颈、双肩、躯干、骨盆、双臂、双手、双腿与双脚比例自然、连接正确。',
    '侧视栏必须是自然的90度全身侧面站姿：头、胸腔、骨盆与双脚朝向一致，近侧手臂从肩部到手掌连续可辨并自然下垂，远侧肢体允许符合透视地部分遮挡，但不得缺失、粘连躯干或长出额外肢体。',
    '禁止人体畸形：禁止肢体缺失或重复、额外手脚、断臂、融肢、关节反折、手指异常、肩胯错位、躯干过窄、头身比例异常、悬空脚、人物穿过分隔线或相邻栏人物互相重叠。',
    '禁止任何版式漂移：禁止2×2宫格、上下两排、右侧四宫格、大小图嵌套、错位拼贴、额外第五格或重复视角；四栏等高、分隔线垂直、背景连续统一。',
    '【视角要求】',
    viewRequirement.trim(),
  ].join('\n');
}
