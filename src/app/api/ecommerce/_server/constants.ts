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
