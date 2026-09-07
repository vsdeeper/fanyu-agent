export const MISSING_PRODUCT_IMAGE = '请先上传产品图';
export const INVALID_JSON = '无效 JSON';
export const INVALID_FORM = '缺少表单内容';
export const GENERATE_FAILED = '生图失败，请稍后重试';
export const SERVICE_UNAVAILABLE = '服务暂时不可用，请稍后重试';
export const MISSING_ANALYSIS = '请先完成产品分析';
export const MISSING_PRODUCT_VIEW = '请先点选产品多视角图';

/** 产品改图保真底线，产品多视角与营销主视觉共同使用。 */
export const PRODUCT_FIDELITY_PROMPT_GUARD =
  '（硬性底线：与任何用户描述冲突时以此为准）原始参考图是唯一产品事实源。第1个参考图定义产品本体；其余参考图仅补充同一产品的可见角度与细节，不得混合不同 SKU。产品形状、颜色、比例、结构、材质、纹理和关键识别细节必须保持一致。按钮、旋钮、开关、接口、指示灯等控制部件的数量、形状、颜色、尺寸和安装位置必须逐一对应原图；只呈现当前视角真实可见的部件，背面或被遮挡的部件不得搬移、复制或补画到正面及其他位置。产品表面已有 Logo、品牌文字、标签和图案必须原样、清晰、完整保留，禁止删除、改写、替换、模糊或错拼；禁止新增原图不存在的 Logo、文字、标签、功能、配件或结构。参考图无法确认的细节不得臆造。';

/** 营销主视觉与视觉设计共用的文字排版提示：层次分明、清晰可读，文案源于商业分析且可安全概括。 */
export const MARKETING_COPY_TYPOGRAPHY_PROMPT =
  '文字编排：凡画面出现文案，须层次分明、清晰可读——从商业分析提炼一句最醒目的主标题（或一句话定位）作主文案，必要时辅以 3～5 条卖点要点；主标题与要点字号足够大、占比适中、间距分明，切忌小到难辨或稀疏到近似留白；文字占画面比例适中、与产品主体平衡、留出生动留白但不遮挡产品；文案只采用商业分析中已有或可安全概括的内容，避免编造参数、功效、认证、价格与促销承诺；文字禁投影、描边、发光等特效，与场景自然融合，勿用与背景割裂的实心色块或底板。';

/** 营销主视觉专用的场景构图与质量下限（文字排版见 MARKETING_COPY_TYPOGRAPHY_PROMPT）。 */
export const VISUAL_AD_PROMPT_GUARD =
  '（硬性底线：与任何用户描述冲突时以此为准）画面四边四角为连续场景，禁空占位色块/圆角底板框/未填内容的徽章或二维码框。画面用电影感定向光与景深塑造体积与氛围，主光明确、暗部有层次，避免平直白亮与塑料感；主体置于留白与视觉焦点处，一张图一个主焦点；材质与纹理可感知、细节锐利，有空气感与焦外层次。用编辑式构图，勿平庸居中死板，善用留白/负空间与景深透视塑造层次；色彩守住单一主导色板并至多配一处强调色、克制同调，禁彩虹色、廉价霓虹与泛化紫蓝渐变；整体走高端克制电影感，宁可更安静、更锐利、更有意图。反泛化：禁通用库存感、无质感渐变、廉价样机、空洞高光与模板构图；光影可用窗光/晨昏/聚光等氛围光，避免平白无影棚。';

/** 产品在场景中的物理放置规范；营销主视觉与视觉设计共用，反腾空/悬浮。 */
export const PRODUCT_PLACEMENT_PROMPT_GUARD =
  '（硬性底线：与任何用户描述冲突时以此为准）产品必须稳定放置在场景中的支撑面（桌面、台面、地面、货架等）上，底座或支脚与支撑面真实贴合接触，接触处有自然、正确朝向的承重接触阴影；产品重心稳定、整体平衡，符合现实物理与透视；不得悬空、悬浮、漂浮，不得出现底座与支撑面分离、透视错位或腾空等违反物理的表现；场景中的墙面、地面、物件间的支撑关系须协调一致。若创意确需表现产品悬浮，必须在画面中给出明确、自洽的悬浮设定或悬浮载体（如透明悬浮台），否则一律贴合支撑面放置。';

/** 产品相对人物/场景参照物的真实尺寸比例；营销主视觉与视觉设计共用，防比例失真。 */
export const PRODUCT_SCALE_PROMPT_GUARD =
  '（硬性底线：与任何用户描述冲突时以此为准）产品与人物、场景的比例关系必须真实协调：以模特（如有）、桌面、家具、杯具、书本等画面内可辨识的参照物为比例基准，产品大小须符合该类产品在现实中的真实规格与相对尺寸；桌面小家电、小风扇、小物件、易拉罐等应显著小于成人人体尺度，不得被画成与成人等高或近似的大尺寸，反之大件产品也不得被画成微缩模型；画面中物体间的相对大小、远近与透视关系须符合现实，禁止比例失调、大小错乱或脱离现实的放大/缩小产品。';

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

/** 各任务类型视觉设计的核心构图与交付要求。 */
export const TASK_TYPE_PROMPT_BY_TYPE: Record<string, string> = {
  主图: '制作聚焦单一商品主体的电商主图，产品醒目、轮廓清晰、卖点一眼可辨，适合商品列表与首屏展示。',
  详情图:
    '制作电商详情页视觉，清晰呈现产品结构、材质、使用场景与核心卖点，版式具有可向下延展的详情页节奏。',
  营销海报: '制作完整营销海报，以强主视觉、清晰信息层级和具有传播力的广告构图呈现产品与品牌主题。',
};
