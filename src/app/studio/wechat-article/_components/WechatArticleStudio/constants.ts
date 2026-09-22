import type { StudioPhase } from './types';

export const STUDIO_STEPS = [
  { title: '选题调研' },
  { title: '内容思路' },
  { title: '成稿写作' },
  { title: '成稿配图' },
  { title: '预览' },
];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  research: 0,
  researching: 0,
  researched: 0,
  plan: 1,
  planning: 1,
  planned: 1,
  draft: 2,
  drafting: 2,
  drafted: 2,
  images: 3,
  illustrating: 3,
  illustrated: 3,
  complete: 4,
};

export const RESEARCH_BUTTON = '开始调研';
export const PLAN_BUTTON = '生成思路';
export const DRAFT_BUTTON = '生成正文';
export const PLAN_IMAGES_BUTTON = '规划配图';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const COMPLETE_BUTTON = '完成';
export const COPY_ARTICLE_BUTTON = '一键复制正文';
export const COPY_IMAGE_BUTTON = '复制图片';
export const GENERATE_SLOT_BUTTON = '生成此图';
export const UPLOAD_SLOT_BUTTON = '上传/粘贴';
export const APPLY_HISTORY_BUTTON = '填入';
export const IMAGE_HISTORY_TITLE = '旧槽位';
export const CURRENT_SLOTS_TITLE = '当前槽位';
export const IMAGE_VISUAL_STYLE_TITLE = '整套视觉约束';
export const IMAGE_VISUAL_STYLE_PLACEHOLDER = '规划配图后自动生成；生图时注入各槽，保证风格统一';
export const STYLE_REFERENCE_LABEL = '风格参考图';
export const STYLE_REFERENCE_SUBTITLE = '可选，规划配图时纳入视觉约束';
export const STYLE_REFERENCE_HINT = '上传一张风格参考图';
export const WATERMARK_LABEL = '水印图';
export const WATERMARK_SUBTITLE = '可选，生成配图时叠加到右下角';
export const WATERMARK_HINT = '上传 logo 或署名，白底会自动抠掉';
export const WATERMARK_ARIA_LABEL = '上传水印图';
export const IMAGE_MODEL_LABEL = '模型';
export const IMAGE_ASPECT_LABEL = '比例';
export const IMAGE_CLARITY_LABEL = '清晰度';

export const MISSING_RESEARCH_INPUT_WARNING = '请至少填写我的想法、我的经历或我的观点之一';
export const MISSING_ANGLE_WARNING = '请先点选一个写作角度';
export const MISSING_PLAN_WARNING = '请先生成并确认内容思路';
export const MISSING_TITLE_WARNING = '请先点选一个标题方向作为成稿标题';
export const MISSING_STYLE_WARNING = '请至少选择一个文风卡片';
export const MISSING_MARKDOWN_WARNING = '请先生成正文';
export const MISSING_ACTIVE_SLOT_WARNING = '请先点选正文标注或槽位';
export const STYLE_LABEL = '文风';
export const DRAFT_TITLE_LABEL = '标题';
export const DRAFT_TITLE_EMPTY = '尚未选定标题';
export const LENGTH_LIMIT_LABEL = '篇幅限制';
export const LENGTH_LIMIT_PLACEHOLDER = '请输入';
export const LENGTH_LIMIT_SUFFIX = '≥字';
export const LENGTH_LIMIT_MIN = 1000;
export const LENGTH_LIMIT_MAX = 5000;
export const RESEARCH_FAILED = '选题调研失败，请稍后重试';
/** 简报写出来了，但末尾 sources/angles JSON 缺失或解析失败 */
export const RESEARCH_NO_ANGLES = '未产出角度卡，请重新调研';
export const PLAN_FAILED = '内容思路生成失败，请稍后重试';
export const DRAFT_FAILED = '成稿失败，请稍后重试';
export const IMAGES_FAILED = '配图规划失败，请稍后重试';
export const TITLE_DIRECTIONS_TITLE = '标题方向（点选一条作为成稿标题）';
export const EDIT_TITLE_BUTTON = '编辑';
export const SAVE_TITLE_BUTTON = '保存';
export const CANCEL_TITLE_BUTTON = '取消';
export const EDIT_BUTTON = '编辑';
export const SAVE_BUTTON = '保存';
export const CANCEL_BUTTON = '取消';
export const DELETE_BUTTON = '删除';
export const COPY_OK = '已复制到剪贴板';
export const COPY_ARTICLE_OK = '已复制，可粘贴到公众号后台';
export const COPY_FAILED = '复制失败，请手动选择文本';
export const COPY_IMAGE_FAILED = '复制图片失败，请右键另存';
export const GENERATE_FAILED = '配图生成失败，请稍后重试';
export const WATERMARK_FAILED = '水印叠加失败，本张按无水印出图';
export const UPLOAD_FAILED = '图片上传失败，请重试';
export const HISTORY_DELETE_FAILED = '已删除，但保存失败，刷新后可能恢复';

export const EMPTY_RESEARCH_HINT =
  '填写想法、经历或观点后点击「开始调研」，将产出检索简报、参考来源与角度卡';
export const RESEARCH_PACKING_HINT = '正在整理参考来源与角度卡…';
export const RESEARCH_NO_ANGLES_HINT = '未产出角度卡，请点击「开始调研」重试';
export const EMPTY_PLAN_HINT = '确认角度后点击「生成思路」，产出轻量写作要点';
export const PLAN_GENERATING_HINT = '正在生成内容思路…';
export const BEAT_DELETE_CONFIRM_TITLE = '删除这条写作要点？';
export const HISTORY_DELETE_CONFIRM_TITLE = '删除这条旧槽位？';
export const MIN_TITLE_DIRECTIONS = 3;
export const EMPTY_DRAFT_HINT = '选定文风后点击「生成正文」';
export const EMPTY_IMAGES_HINT =
  '点击「规划配图」后，正文会出现可点击的配图标注；也可直接「下一步」跳过配图';

export const RESEARCH_BRIEF_TITLE = '检索简报';
export const RESEARCH_SOURCES_TITLE = '参考来源';
export const RESEARCH_ANGLES_TITLE = '角度卡（点选一张）';

export const DEFAULT_IMAGE_MODEL = 'gpt-image-2-vip';
/** 槽位默认比例：公众号头图就是 2.35:1，封面与正文配图统一按它出图。 */
export const DEFAULT_IMAGE_ASPECT = '2.35:1';
export const DEFAULT_IMAGE_CLARITY = '1K';

/**
 * 水印尺寸与离边线的留白都以**成图宽度**为基准，全篇配图才能在同一栏宽下显示成一样大、一样靠角。
 * 水印等比缩放进「宽 = 成图宽 × WATERMARK_WIDTH_RATIO」的方形盒子。
 */
export const WATERMARK_WIDTH_RATIO = 0.09;
/** 距右边线的留白占成图宽的比例。 */
export const WATERMARK_RIGHT_RATIO = 0.03;
/**
 * 距底边线的留白占成图宽的比例：比右边留得多，压在微信自带的「公众号：xxx」水印带之上，两者不叠。
 * 微信那条水印带顶边约在栏宽 4.3% 处（按 677 栏宽实测约 29px），故这里留 6%——够让开，
 * 又不会像 10% 那样在小尺寸水印下显得离角太远。
 */
export const WATERMARK_BOTTOM_RATIO = 0.06;
/** 水印整体不透明度：压印感，不盖住画面主体（墨色本就按底图深浅选过，这里只调轻重）。 */
export const WATERMARK_OPACITY = 0.3;

/** 水印抠底：四角色差在此以内才算纯色底；距底色近于此比例的像素判为底色。 */
export const WATERMARK_BACKDROP_TOLERANCE = 24;
export const WATERMARK_BACKDROP_ALPHA_CUTOFF = 0.08;
/** alpha 不高于此值视为透明像素；四角全透明即认定这张水印本身就是透明底图，不走抠底。 */
export const WATERMARK_TRANSPARENT_ALPHA_MAX = 250;
/** 四角都亮于此亮度也认作可抠的浅色底——烤进棋盘格的「伪透明」导出四角并不一致。 */
export const WATERMARK_LIGHT_BACKDROP_LUMINANCE = 200;
/** alpha 大于此值才算水印墨迹，用于裁掉画布边距。 */
export const WATERMARK_INK_ALPHA_MIN = 8;
/** 全图与底色的最大色差低于此值说明整幅都是底色（抠完等于全透明），放弃抠底。 */
export const WATERMARK_MIN_INK_DISTANCE = 48;

/** 像素亮度高于此值算「偏亮」；水印盖住那块里偏亮像素过半即判为浅底，改用近黑墨。 */
export const WATERMARK_BRIGHT_PIXEL_LUMINANCE = 140;
/** 深底用白墨、浅底用近黑墨（纯黑偏生硬）：同色叠同色等于没叠，故墨色跟着底图走。 */
export const WATERMARK_INK_ON_DARK: readonly [number, number, number] = [255, 255, 255];
export const WATERMARK_INK_ON_LIGHT: readonly [number, number, number] = [22, 22, 22];
/** 水印合成后按原图 mime 导出；JPEG 用该质量重编码。 */
export const WATERMARK_JPEG_QUALITY = 0.92;

export const IMAGE_ASPECT_RATIO_OPTIONS = [
  { value: '1:1', label: '1:1 方形' },
  { value: '3:4', label: '3:4 竖版' },
  { value: '3:2', label: '3:2 横版' },
  { value: '4:3', label: '4:3 横版' },
  { value: '9:16', label: '9:16 竖版' },
  { value: '16:9', label: '16:9 横版' },
  { value: '2.35:1', label: '2.35:1 横版' },
  { value: '1:2.35', label: '1:2.35 竖版' },
];

export const SOURCE_KIND_LABEL = {
  fact: '事实',
  view: '观点',
  case: '案例',
} as const;

export const IMAGE_MARKER_LINE_RE = /^【配图：(.+?)】\s*$/;
