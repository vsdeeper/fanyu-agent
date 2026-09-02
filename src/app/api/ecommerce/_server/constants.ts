export const MISSING_PRODUCT_IMAGE = '请先上传产品图';
export const INVALID_JSON = '无效 JSON';
export const INVALID_FORM = '缺少表单内容';
export const HELP_WRITE_FAILED = '需求生成失败，请稍后重试';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const SLOTS_PARSE_FAILED = '规划解析失败，请重新分析';
export const SERVICE_UNAVAILABLE = '服务暂时不可用，请稍后重试';

/**
 * 出站改图守卫：产品保真 + 文字占比 + 电影感质量下限；不从 skill catalog 引用。
 */
export const PRODUCT_EDIT_PROMPT_GUARD =
  '（服务端强制）第1个参考图=产品本体，形状/颜色/材质/细节严格100%不变；其余参考仅作背景/色调/氛围/构图语言的风格参考，不改变产品本体。文字按最小编排：主标题字高≤画面高约1/6，整段文字总高≤画面高约40%，文字不压产品主体，四周留白≥5%；文字禁任何投影/描边/发光等阴影效果；文字与产品场景背景自然融为一体，勿用与背景割裂的实心纯色块/不透明底板，文案区与产品画面须连续成一张照片。画面四边四角为连续场景，禁空占位色块/圆角底板框/未填内容的徽章或二维码框。画面用电影感定向光与景深塑造体积与氛围，主光明确、暗部有层次，避免平直白亮与塑料感；主体置于留白与视觉焦点处，一张图一个主焦点；材质与纹理可感知、细节锐利。';

export const DESIGN_TYPE_LABEL: Record<string, string> = {
  main: '主图',
  detail: '详情图',
  ad: '广告图',
};

export const PLATFORM_LABEL: Record<string, string> = {
  auto: '智能匹配',
  taobao: '淘宝/天猫',
  jd: '京东',
  pdd: '拼多多',
  douyin: '抖音',
  xiaohongshu: '小红书',
};

export const LANGUAGE_LABEL: Record<string, string> = {
  visual: '无文字(纯视觉)',
  'zh-CN': '中文简体',
  en: '英文',
};

export const MAX_STUDIO_PRODUCT_IMAGES = 6;
// 覆盖各生图类型/平台可选数量（主图随平台至 5，详情图 2/4/6/8，广告图 1/2/4）的并集。
export const STUDIO_COUNT_VALUES = [1, 2, 3, 4, 5, 6, 8] as const;
