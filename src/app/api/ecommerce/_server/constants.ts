import type { EcommerceDesignType } from '@/app/api/ecommerce/_shared/types';

export const MISSING_PRODUCT_IMAGE = '请先上传产品图';
export const INVALID_JSON = '无效 JSON';
export const INVALID_FORM = '缺少表单内容';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const SERVICE_UNAVAILABLE = '服务暂时不可用，请稍后重试';
export const MISSING_ANALYSIS = '请先完成产品分析';
export const MISSING_PRODUCT_VIEW = '请先点选产品多视角图';
export const MISSING_VISUAL = '请先点选营销主视觉';
export const MODEL_HELP_WRITE_FAILED = '模特要求生成失败，请稍后重试';

/** 产品改图保真底线，产品多视角与营销主视觉共同使用。 */
export const PRODUCT_FIDELITY_PROMPT_GUARD =
  '（服务端强制）原始参考图是唯一产品事实源。第1个参考图定义产品本体；其余参考图仅补充同一产品的可见角度与细节，不得混合不同 SKU。产品形状、颜色、比例、结构、材质、纹理和关键识别细节必须保持一致。按钮、旋钮、开关、接口、指示灯等控制部件的数量、形状、颜色、尺寸和安装位置必须逐一对应原图；只呈现当前视角真实可见的部件，背面或被遮挡的部件不得搬移、复制或补画到正面及其他位置。产品表面已有 Logo、品牌文字、标签和图案必须原样、清晰、完整保留，禁止删除、改写、替换、模糊或错拼；禁止新增原图不存在的 Logo、文字、标签、功能、配件或结构。参考图无法确认的细节不得臆造。';

/** 营销主视觉专用的文字编排、场景构图与质量下限。 */
export const VISUAL_AD_PROMPT_GUARD =
  '（服务端强制）文字按最小编排：主标题字高≤画面高约1/6，整段文字总高≤画面高约40%，文字不压产品主体，四周留白≥5%；文字禁任何投影/描边/发光等阴影效果；文字与产品场景背景自然融为一体，勿用与背景割裂的实心纯色块/不透明底板，文案区与产品画面须连续成一张照片。画面四边四角为连续场景，禁空占位色块/圆角底板框/未填内容的徽章或二维码框。画面用电影感定向光与景深塑造体积与氛围，主光明确、暗部有层次，避免平直白亮与塑料感；主体置于留白与视觉焦点处，一张图一个主焦点；材质与纹理可感知、细节锐利，有空气感与焦外层次。用编辑式构图，勿平庸居中死板，善用留白/负空间与景深透视塑造层次；色彩守住单一主导色板并至多配一处强调色、克制同调，禁彩虹色、廉价霓虹与泛化紫蓝渐变；整体走高端克制电影感，宁可更安静、更锐利、更有意图。反泛化：禁通用库存感、无质感渐变、廉价样机、空洞高光与模板构图；光影可用窗光/晨昏/聚光等氛围光，避免平白无影棚。';

export const MAX_STUDIO_PRODUCT_IMAGES = 6;
export const MAX_STUDIO_PRODUCT_DOCS = 6;
export const MAX_STUDIO_MODEL_IMAGES = 3;
export const MAX_STUDIO_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCX_MEDIA_TYPE =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
export const PDF_MEDIA_TYPE = 'application/pdf';
export const STUDIO_DOC_EXTS = ['pdf', 'txt', 'md', 'docx'] as const;
export const STUDIO_DOC_IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'gif'] as const;
export const STUDIO_COUNT_VALUES = [1, 2, 3, 4] as const;

/** 各视觉设计物料的核心构图与交付要求。 */
export const DESIGN_TYPE_PROMPT_BY_TYPE: Record<EcommerceDesignType, string> = {
  主图: '制作聚焦单一商品主体的电商主图，产品醒目、轮廓清晰、卖点一眼可辨，适合商品列表与首屏展示。',
  详情图:
    '制作电商详情页视觉，清晰呈现产品结构、材质、使用场景与核心卖点，版式具有可向下延展的详情页节奏。',
  营销海报: '制作完整营销海报，以强主视觉、清晰信息层级和具有传播力的广告构图呈现产品与品牌主题。',
  手机界面:
    '制作适配手机竖屏浏览的商业界面视觉，建立明确的移动端信息层级、触控友好布局与产品展示区域。',
  产品包装: '制作可实际落地的产品包装视觉，包装结构、品牌识别、产品信息区与货架辨识度协调统一。',
  广告牌:
    '制作适合远距离观看的广告牌视觉，主体和核心信息足够醒目，构图简洁，避免依赖细小文字与复杂细节。',
  展架: '制作适合线下展架的竖向宣传视觉，远近阅读层级明确，产品、品牌和核心卖点在有限版面中清晰呈现。',
  橱窗: '制作完整橱窗陈列视觉，兼顾空间纵深、产品焦点、品牌氛围和街道观看视角，形成有吸引力的展示场景。',
  线下展示空间:
    '制作可落地的品牌线下展示空间视觉，统筹空间动线、产品陈列、灯光、材质和品牌识别，呈现真实尺度感。',
};
