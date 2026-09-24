import 'server-only';

import {
  BRAND_LOGO_PROMPT,
  DETAIL_IMAGE_CONTINUITY_PROMPT,
  DETAIL_IMAGE_COPY_TYPOGRAPHY_PROMPT,
  DETAIL_IMAGE_FIDELITY_NO_REFERENCE_PROMPT,
  DETAIL_IMAGE_FRAMING_NO_REFERENCE_PROMPT,
  DETAIL_IMAGE_FRAMING_PROMPT,
  TASK_TYPE_PROMPT_BY_TYPE,
  MAIN_IMAGE_COPY_REFERENCE_PROMPT,
  MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT,
  MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT,
  MAIN_IMAGE_FIDELITY_NO_REFERENCE_PROMPT,
  MARKETING_COPY_TYPOGRAPHY_PROMPT,
  MARKETING_FIDELITY_NO_REFERENCE_PROMPT,
  PRODUCT_FIDELITY_PROMPT_GUARD,
  PRODUCT_PLACEMENT_PROMPT_GUARD,
  PRODUCT_REFINE_FIDELITY_PROMPT_GUARD,
  PRODUCT_SCALE_PROMPT_GUARD,
  THEME_PLAN_TEXTLESS_PROMPT,
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
  /** 产品精修图张数（不含文案标准参考图与品牌 Logo） */
  productImageCount: number;
  hasCopyReference: boolean;
  hasBrandLogo: boolean;
  productDocumentsText?: string;
  visualMoodSummary?: string;
  /** 缺省视为否 */
  textlessVisual?: boolean;
  /** 缺省视为是 */
  unifyVisualMood?: boolean;
};

type ThemePlanVisualResolved = {
  injectMood: boolean;
  mood: string;
  textlessVisual: boolean;
  unifyVisualMood: boolean;
};

/**
 * 解析气质摘要与两个出图开关；缺省与表单默认一致（统一气质是、无文字否）。
 */
function resolveThemePlanVisual(input: {
  visualMoodSummary?: string;
  textlessVisual?: boolean;
  unifyVisualMood?: boolean;
}): ThemePlanVisualResolved {
  const unifyVisualMood = input.unifyVisualMood !== false;
  const mood = input.visualMoodSummary?.trim() ?? '';
  return {
    unifyVisualMood,
    textlessVisual: input.textlessVisual === true,
    mood,
    injectMood: unifyVisualMood && Boolean(mood),
  };
}

/**
 * 电商主图出站 prompt：气质摘要定整套氛围（可关），本张主题卡定文案与拍法；精修图为产品事实。
 *
 * `productImageCount` / `hasCopyReference` / `hasBrandLogo` 必填：参考图数组顺序为
 * 产品精修图 → 文案标准参考图 → 品牌 Logo，必须按真实张数点名序号，否则默认那句
 * 「其余参考图仅补充同一产品的可见角度」会把后两张图误当成同一产品的另一角度。
 * 产品精修图非必填：`productImageCount === 0` 时没有产品角度可言，产品图那句与产品保真底线都要换成无参考图的说法。
 * 纯视觉无文字时调用方不得再传文案标准参考图，`hasCopyReference` 应为 false。
 */
export function buildMainImagePrompt(input: MainImagePromptInput): string {
  const { productImageCount, hasBrandLogo } = input;
  const visual = resolveThemePlanVisual(input);
  const hasCopyReference = visual.textlessVisual ? false : input.hasCopyReference;
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
          BRAND_LOGO_PROMPT,
        ]
      : []),
  ];
  return [
    '生成恰好一张电商主图，不要输出说明、草图或多方案拼图。',
    ...referenceRules,
    '产品底座必须贴实支撑面：四边接触、接触阴影贴边连续，禁止腾空、半边离地或阴影与底座分离；主图不允许悬浮创意。',
    visual.injectMood
      ? '根据【视觉气质摘要】确定整套配色、光影气质、材质与品牌氛围；本张空间、道具、机位与构图切片以【本张主题卡】的展示重点为准。'
      : visual.unifyVisualMood
        ? '本张空间、道具、机位与构图切片以【本张主题卡】的展示重点为准。'
        : '本张配色、光影与品牌氛围以【本张主题卡】为准，不必与其它张统一视觉气质；本张空间、道具、机位与构图切片以【本张主题卡】的展示重点为准。',
    visual.textlessVisual
      ? THEME_PLAN_TEXTLESS_PROMPT
      : '本张出现的画面文案只来自【本张主题卡】的「画面文案」列表；禁止把展示重点里的拍法说明当文字写进画面。',
    '禁止把空洞白底棚拍或同一套通用生活方式模板当作所有主题的默认背景；套图之间构图与场景须按各自展示重点区分。',
    ...(visual.injectMood ? ['【视觉气质摘要】', visual.mood] : []),
    ...(productDocsText
      ? [
          '【产品资料】',
          productDocsText,
          '品牌、产品名与规格数值等第一手产品事实以【产品资料】为准，缺失时以【本张主题卡】为准。',
        ]
      : []),
    '【本张主题卡】',
    input.requirement.trim(),
    ...(visual.textlessVisual
      ? []
      : [
          hasCopyReference
            ? MAIN_IMAGE_COPY_TYPOGRAPHY_WITH_REFERENCE_PROMPT
            : MAIN_IMAGE_COPY_TYPOGRAPHY_PROMPT,
        ]),
    VISUAL_AD_PROMPT_GUARD,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    // 无产品参考图时「第1个参考图定义产品本体」无从对位，换成按描述呈现 + 跨张一致的说法
    hasProductReference ? PRODUCT_FIDELITY_PROMPT_GUARD : MAIN_IMAGE_FIDELITY_NO_REFERENCE_PROMPT,
  ].join('\n');
}

/** `buildDetailImagePrompt` 入参：尾部可选值同型，一律走具名键，避免位置传错后只静默串值。 */
export type DetailImagePromptInput = {
  /** 本屏主题卡正文 */
  requirement: string;
  /** 产品精修图张数（不含上一屏与品牌 Logo）；可为 0（非必填，无参考图时降级为文生图） */
  productImageCount: number;
  hasPreviousScreen: boolean;
  hasBrandLogo: boolean;
  productDocumentsText?: string;
  visualMoodSummary?: string;
  textlessVisual?: boolean;
  unifyVisualMood?: boolean;
};

/**
 * 电商详情图出站 prompt：气质摘要定整套氛围（可关），当前屏主题卡定本张内容；精修图为产品事实。
 *
 * `productImageCount` / `hasPreviousScreen` / `hasBrandLogo` 必填：参考图数组顺序为
 * 产品精修图 → 上一屏 → 品牌 Logo，必须按真实张数点名序号，否则「其余精修图仅补充同一产品的其它角度」
 * 会把后两张图误当成同一产品的另一角度或另一屏。
 * 产品精修图非必填：`productImageCount === 0` 时没有产品角度可言，产品图那句、取景句与产品保真底线
 * 都要换成无参考图的说法（否则模型会去对位一张并不存在的第 1 张）。
 */
export function buildDetailImagePrompt(input: DetailImagePromptInput): string {
  const { productImageCount, hasPreviousScreen, hasBrandLogo } = input;
  const visual = resolveThemePlanVisual(input);
  const productDocsText = input.productDocumentsText?.trim();
  const hasProductReference = productImageCount > 0;
  // 取景句与保真底线都由「有没有产品精修图」决定、必须同进同退，故取一次值，
  // 不让两处各写一个基于同一条件的独立三元（漏改一处就会留下与不存在的参考图对位的句子）
  const productReference = hasProductReference
    ? { framing: DETAIL_IMAGE_FRAMING_PROMPT, fidelity: PRODUCT_FIDELITY_PROMPT_GUARD }
    : {
        framing: DETAIL_IMAGE_FRAMING_NO_REFERENCE_PROMPT,
        fidelity: DETAIL_IMAGE_FIDELITY_NO_REFERENCE_PROMPT,
      };
  const productRange =
    productImageCount <= 1 ? '第1个参考图' : `第1至第${productImageCount}个参考图`;
  // 序号按参考图数组的真实位置算，不能用 max(1, P) 兜底：P=0 时上一屏就是第 1 张
  const previousIndex = productImageCount + 1;
  const logoReferenceIndex = previousIndex + (hasPreviousScreen ? 1 : 0);
  const referenceRules = [
    hasProductReference
      ? `${productRange}=用户上传的产品精修图，定义产品本体外观、颜色、材质与结构；不得把精修图的拍摄角度、取景远近或产品占画面大小复制到本屏。其余精修图仅补充同一产品的其它可见角度与细节，供本屏按展示重点选用合适机位，不得混合不同 SKU。产品外观、颜色、结构、材质与细节如下方产品保真底线为准。`
      : '本屏没有产品精修图参考：产品本体按【当前屏主题卡】与【产品资料】的描述呈现，不得臆造品牌、规格、结构或资料未提及的细节。',
    ...(hasPreviousScreen
      ? [
          `第${previousIndex}个参考图=上一屏详情图，只锁定整套详情页的视觉语言，不是当前屏要复制的构图、主题或产品机位。`,
          DETAIL_IMAGE_CONTINUITY_PROMPT,
          '上一屏只作风格参考，画面信息、构图切片、文案以及产品角度/远近/占比必须按【当前屏主题卡】重新设计，禁止复刻上一屏版式、卖点或同一产品机位。',
        ]
      : []),
    ...(hasBrandLogo
      ? [
          `第${logoReferenceIndex}个参考图（即【品牌 Logo】）=用户上传的品牌 Logo 原图，是画面中品牌标识的呈现依据。`,
          BRAND_LOGO_PROMPT,
        ]
      : []),
  ];

  return [
    '生成恰好一张电商详情页当前屏，不要输出说明、草图或多方案拼图。',
    ...referenceRules,
    visual.injectMood
      ? '根据【视觉气质摘要】确定整套配色、光影气质、材质与品牌氛围。'
      : visual.unifyVisualMood
        ? undefined
        : '本屏配色、光影与品牌氛围以【当前屏主题卡】为准，不必与其它屏统一视觉气质。',
    visual.textlessVisual
      ? THEME_PLAN_TEXTLESS_PROMPT
      : '本张画面信息、产品机位（角度/远近/占比）与构图切片只来自【当前屏主题卡】的设计目标与展示重点；若需上字，从设计目标转化短句，禁止照搬展示重点里的拍法说明。',
    ...(visual.injectMood ? ['【视觉气质摘要】', visual.mood] : []),
    ...(productDocsText
      ? [
          '【产品资料】',
          productDocsText,
          '品牌、产品名与规格数值等第一手产品事实以【产品资料】为准，缺失时以【当前屏主题卡】为准。',
        ]
      : []),
    '【当前屏主题卡】',
    input.requirement.trim(),
    productReference.framing,
    ...(visual.textlessVisual ? [] : [DETAIL_IMAGE_COPY_TYPOGRAPHY_PROMPT]),
    VISUAL_AD_PROMPT_GUARD,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    productReference.fidelity,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

/** `buildVisualPrompt` 入参：尾部可选值同型，一律走具名键，避免位置传错后只静默串值。 */
export type VisualPromptInput = {
  /** 商业分析正文 */
  analysisText: string;
  /** 产品精修图张数（不含品牌 Logo）；可为 0（非必填，无参考图时降级为文生图） */
  productImageCount: number;
  hasBrandLogo: boolean;
};

/**
 * 营销主视觉出站 prompt：商业分析为内容依据，上传的全部产品图为改图参考。
 *
 * `productImageCount` / `hasBrandLogo` 必填：参考图数组顺序为 产品精修图 → 品牌 Logo，
 * 必须按真实张数点名序号，否则默认那句「其余参考图仅补充同一产品的可见角度」会把 Logo 误当成同一产品的另一角度。
 * 产品精修图非必填：`productImageCount === 0` 时没有产品角度可言，产品图那句与产品保真底线都要换成无参考图的说法。
 */
export function buildVisualPrompt(input: VisualPromptInput): string {
  const { productImageCount, hasBrandLogo } = input;
  const hasProductReference = productImageCount > 0;
  const productRange =
    productImageCount <= 1 ? '第1个参考图' : `第1至第${productImageCount}个参考图`;
  // 序号按参考图数组的真实位置算，不能用 max(1, P) 兜底：P=0 时品牌 Logo 就是第 1 张
  const logoReferenceIndex = productImageCount + 1;
  const productRule = !hasProductReference
    ? '本批没有产品精修图参考：产品本体按【商业分析】的描述呈现，不得臆造品牌、规格、结构或资料未提及的细节。'
    : hasBrandLogo
      ? productImageCount <= 1
        ? '第1个参考图=用户上传的产品精修图，定义产品本体；本批只有这一张产品图，没有其它产品角度参考。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。'
        : `${productRange}=用户上传的产品精修图，定义产品本体；该范围内的图都属于同一产品，仅补充其可见角度与细节，不得混合不同 SKU。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。`
      : '第1个参考图=用户上传的产品精修图，定义产品本体；其余参考图仅补充同一产品的可见角度与细节，不得混合不同 SKU。主视觉只输出一张完整广告图。';

  return [
    '生成一张电商营销主视觉图，作为后续所有设计物料的统一视觉标准。',
    productRule,
    ...(hasBrandLogo
      ? [
          `第${logoReferenceIndex}个参考图（即【品牌 Logo】）=用户上传的品牌 Logo 原图，是画面中品牌标识的呈现依据。`,
          BRAND_LOGO_PROMPT,
        ]
      : []),
    '根据商业分析确定整体配色、场景、光影、构图、品牌氛围与视觉风格。',
    '画面突出产品主体，具有商业广告品质；一张图一个主焦点。',
    '【商业分析】',
    input.analysisText.trim(),
    MARKETING_COPY_TYPOGRAPHY_PROMPT,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    hasProductReference ? PRODUCT_FIDELITY_PROMPT_GUARD : MARKETING_FIDELITY_NO_REFERENCE_PROMPT,
    VISUAL_AD_PROMPT_GUARD,
  ].join('\n');
}

/** `buildDesignPrompt` 入参：尾部可选值同型，一律走具名键，避免位置传错后只静默串值。 */
export type DesignPromptInput = {
  taskType: string;
  /** 商业分析正文 */
  analysisText: string;
  includeModel: boolean;
  /** 产品精修图张数（不含主视觉、品牌 Logo 与模特图）；可为 0（非必填，无参考图时降级为文生图） */
  productImageCount: number;
  /** 是否点选了营销主视觉作视觉标准；未点选时风格全按商业分析定 */
  hasVisualStandard: boolean;
  hasBrandLogo: boolean;
};

/**
 * 视觉设计出站 prompt：以分析和任务类型定目标，产品标准图定产品，视觉标准（若点选）定风格，可选 Logo 与模特图补品牌标识与人物身份。
 *
 * `productImageCount` / `hasVisualStandard` / `hasBrandLogo` 必填：参考图数组顺序为
 * 产品精修图 → 主视觉 → 品牌 Logo → 模特图（前三段都可缺省），必须按真实张数点名序号，
 * 否则「其余参考图仅补充同一产品的可见角度」会把主视觉、Logo 与模特图一并误当成产品图，
 * 模特那句「第 N 个及之后」也会指到 Logo 上。
 * 产品精修图非必填：`productImageCount === 0` 时第 1 张就是主视觉或 Logo，产品图那句与产品保真底线都要换成无参考图的说法。
 * 视觉标准非必选：`hasVisualStandard === false` 时没有主视觉可延续，配色与光影全按商业分析定。
 */
export function buildDesignPrompt(input: DesignPromptInput): string {
  const { taskType, includeModel, productImageCount, hasVisualStandard, hasBrandLogo } = input;
  const hasProductReference = productImageCount > 0;
  const productRange =
    productImageCount <= 1 ? '第1个参考图' : `第1至第${productImageCount}个参考图`;
  const visualReferenceIndex = productImageCount + 1;
  // Logo 紧随主视觉，模特图排在 Logo 之后：模特那句是「第 N 个及之后」，Logo 若排在其后会被一并算成模特
  const logoReferenceIndex = visualReferenceIndex + (hasVisualStandard ? 1 : 0);
  const modelFromIndex = logoReferenceIndex + (hasBrandLogo ? 1 : 0);
  const referenceRules = [
    hasProductReference
      ? productImageCount <= 1
        ? '第1个参考图=用户上传的产品精修图，定义产品本体；本批只有这一张产品图，没有其它产品角度参考。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。'
        : `${productRange}=用户上传的产品精修图，定义产品本体；该范围内的图都属于同一产品，仅补充其可见角度与细节，不得混合不同 SKU。产品外观、颜色、比例、结构、材质与细节如下方产品保真底线为准。`
      : '本批没有产品精修图参考：产品本体按【商业分析】的描述呈现，不得臆造品牌、规格、结构或资料未提及的细节。',
    ...(hasVisualStandard
      ? [
          `第${visualReferenceIndex}个参考图=已选营销主视觉，用于延续配色、光影、品牌氛围与视觉语言，不要求照搬原构图。`,
        ]
      : [
          '本批没有已选营销主视觉参考：整体配色、光影与品牌氛围按【商业分析】确定，不要照搬任何外部版式。',
        ]),
    ...(hasBrandLogo
      ? [
          `第${logoReferenceIndex}个参考图（即【品牌 Logo】）=用户上传的品牌 Logo 原图，是画面中品牌标识的呈现依据。`,
          BRAND_LOGO_PROMPT,
        ]
      : []),
    ...(includeModel
      ? [
          `第${modelFromIndex}个及之后的参考图=同一位模特的身份与着装参考，必须把该人物融合进成品画面并参与构图，不得省略人物或换成别人。`,
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
    input.analysisText.trim(),
    VISUAL_AD_PROMPT_GUARD,
    PRODUCT_SCALE_PROMPT_GUARD,
    PRODUCT_PLACEMENT_PROMPT_GUARD,
    hasProductReference ? PRODUCT_FIDELITY_PROMPT_GUARD : MARKETING_FIDELITY_NO_REFERENCE_PROMPT,
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

/** 公众号配图：槽位画面描述 + 可选整套视觉约束，文生图。 */
export function buildWechatInlinePrompt(prompt: string, visualStyle?: string): string {
  const lines = [
    '生成恰好一张适合微信公众号的配图，不要输出说明文字。',
    '画面干净、清爽且简洁、高级：构图上乘，留白是有意图的负空间而不是空荡，色彩克制，画面讲究质感与光影层次；信息层级清晰，避免杂乱文字墙；若提示词要求画面内文字，保持可读。',
    '禁止廉价感画风：扁平矢量插画、细描边涂鸦、简笔画、PPT 与素材库风的扁平小人、卡通表情风；简洁不等于简陋，不得用无细节色块与空画面充数。',
    '用摄影质感时须是布光讲究、背景干净、设计过的商业质感：禁止纪实、新闻、抓拍、生活随拍那种随手一拍的味道。',
    '若画面有人物：以中国人为主（东亚面孔、自然妆发与着装、中国大陆生活语境）；同一套配图人物形象须统一，禁止中西面孔或国内外气质混用。',
    '人物一律按虚构、非特指的普通人处理：禁止出现可辨识的真实人物或公众人物形象，禁止暴露、性化着装与政治、宗教、民族、军警等敏感身份符号。',
    '画面不得出现清晰可辨的人物面容：优先不出现人物；确需人物时用背影、侧影、剪影、远景、身体局部（手、肩、器物）或虚化、遮挡处理，禁止正面或半侧面的清晰面部特写、证件照式构图与五官可辨的肖像。',
  ];
  const style = visualStyle?.trim();
  if (style) {
    lines.push(
      '【整套配图视觉约束】以下对本张强制生效，不得改用其它媒介、画风、光影气质或人物外貌设定：',
      style,
      '【本张画面】只描述本张主体、构图与情节；媒介、画风、色调、光影与人物形象须服从上方整套约束。',
    );
  } else {
    lines.push('【配图要求】');
  }
  lines.push(prompt.trim());
  return lines.join('\n');
}

/**
 * 图文配图：按图文卡片内容出一张图。
 * 不预设媒介或色调；有视觉参考时对齐画风、配色、字体与排版风格。
 * 正文一律作事实与文案来源：允许取舍精简上屏，禁止全文塞进画面；有「我的要求」时再按其优先筛选。
 */
export function buildImageTextPrompt(
  prompt: string,
  refs?: {
    hasStyleReference?: boolean;
    hasCharacterModel?: boolean;
    characterRequirement?: string;
  },
): string {
  const lines = [
    '生成恰好一张图文卡片成品图，不要输出说明文字。',
    '画面本身就是完整卡片：主体清晰、版式干净疏朗；四周须留足安全边距与呼吸感，禁止贴边排满、出血顶满或把画布塞成信息墙。',
    '文案上屏须克制：优先标题与少量关键句，字号够大、层级分明；宁可少写、写准，也不要为「内容完整」把要点、列表、步骤、配伍等一并塞进同一张图。',
    '禁止出现手机外框、刘海/挖孔、状态栏、浏览器顶栏、App 导航栏、桌面壁纸或任何设备/界面外壳；不要做成「手机截图」或「手机里的卡片」效果。',
  ];
  const requirement = refs?.characterRequirement?.trim();
  if (refs?.hasStyleReference) {
    if (requirement) {
      lines.push(
        '【视觉参考图】对齐画风、配色、字体，以及简洁构图与信息密度；若参考为多人分栏，保留多人同框关系；勿复刻其人物相貌与原文案；版式密度以【我的要求】为准，勿因正文变成长文信息图。',
      );
    } else {
      lines.push(
        '【视觉参考图】对齐画风、配色、字体与排版气质；若参考为多人分栏，保留多人同框关系；勿复刻其人物相貌、原文案或参考图本身的高密度信息墙版式。',
      );
    }
  }
  if (refs?.hasCharacterModel) {
    if (requirement) {
      lines.push(
        '【人物模特】锁定其中每一位人物的身份与外貌；参考图若含多人（如上下分栏的男、女），须全部出镜、人数与性别一致，不得只保留其中一人；姿态、出镜与手臂角度等服从【我的要求】并分别施加于各人，未提及处再沿用模特自然姿态；勿复刻其背景。',
      );
    } else {
      lines.push(
        '【人物模特】锁定其中每一位人物的身份与外貌并自然融入本张卡片；参考图若含多人（如上下分栏的男、女），须全部出镜、人数与性别一致，不得只保留其中一人；勿复刻其背景，构图宜保持多人同框关系。',
      );
    }
  }
  if (requirement) {
    lines.push(
      '【我的要求】约束画面呈现（人物姿态、信息取舍、版式密度），优先于正文默认的信息密度与章节结构：',
      requirement,
      '姿态、角度、出镜方式的补充只改变人物动作，不得据此把正文扩成步骤说明、功效列表、配图栏目等额外信息板块，也不得因此删减人物模特中的任一人物。',
      '若要求写明仅做标识标注、或不要展示其它内容：以人物为主体，只叠加必要标记点与引出标注；最多保留标题与一句说明；禁止多栏信息框、步骤列表、配图栏目、图标栏等长文信息图版式。',
      '【本张画面 / 图文内容】仅作事实与文案来源（知识库），非必须全文上屏；只提炼【我的要求】所需的标题与极少量文案，勿按正文 ## 小节结构整页铺开。',
      prompt.trim(),
    );
  } else {
    lines.push(
      '【本张画面 / 图文内容】仅作事实与文案来源，非必须全文上屏：在不失真、不编造的前提下取舍精简，通常保留标题与 1～3 个最能传达主题的要点或一句摘要即可；勿按正文 ## 小节、列表、步骤逐条铺满画面，禁止多栏信息框、密排图标栏与百科式长文信息图。',
      prompt.trim(),
    );
  }
  return lines.join('\n');
}
