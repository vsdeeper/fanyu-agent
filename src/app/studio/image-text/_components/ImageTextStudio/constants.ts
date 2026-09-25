import type { ImageTextPhase } from './types';

export const STUDIO_STEPS = [{ title: '图文内容' }, { title: '图文生成' }, { title: '预览' }];

export const STUDIO_STEP_INDEX: Record<ImageTextPhase, number> = {
  plan: 0,
  planning: 0,
  planned: 0,
  generate: 1,
  preview: 2,
};

export const PLAN_BUTTON = '生成内容';
export const GENERATE_BUTTON = '生成图片';
export const PREV_BUTTON = '上一步';
export const NEXT_BUTTON = '下一步';
export const EDIT_BUTTON = '编辑';
export const SAVE_BUTTON = '保存';
export const CANCEL_BUTTON = '取消';
export const CANCEL_GENERATE_BUTTON = '取消生成';
export const CANCEL_GENERATE_CONFIRM_TITLE = '取消生成';
export const CANCEL_GENERATE_CONFIRM_DESCRIPTION =
  '已生成的图片会保留，当前生成将停止。确定取消吗？';
export const CANCEL_GENERATE_CONFIRM_OK = '取消生成';
export const CANCEL_GENERATE_CONFIRM_BACK = '继续生成';

export const MATERIALS_LABEL = '素材';
export const MATERIALS_HINT = '上传参考图以提炼主题与要点；也可只填内容';
export const CONTENT_LABEL = '内容';
export const CONTENT_PLACEHOLDER = '粘贴或填写主题、大纲、要点等，将整理成图文卡片';
export const CONTENT_REQUIREMENT_LABEL = '我的要求';
export const CONTENT_REQUIREMENT_HINT =
  '可约束正文结构与详略，例如必须含某些 ## 小节、删减某类段落；有填写时优先于默认取舍';
export const CONTENT_REQUIREMENT_PLACEHOLDER =
  '可选：如「必须包含 ## 步骤说明 与 ## 注意事项」「删去背景介绍，只保留操作要点」';
export const CONTENT_REQUIREMENT_MAX_LENGTH = 500;
export const VISUAL_REFERENCE_LABEL = '视觉参考';
export const VISUAL_REFERENCE_HINT =
  '上传一张图，只对齐画风、配色、字体与气质；不作为标识点/标注位置依据';
export const CHARACTER_MODEL_LABEL = '人物模特';
export const CHARACTER_MODEL_HINT = '上传一张图，锁定人物形象';
export const CHARACTER_REQUIREMENT_LABEL = '我的要求';
export const CHARACTER_REQUIREMENT_HINT =
  '可约束人物姿态与出镜，也可说明画面要展示哪些信息、禁止哪些板块；有填写时正文仅作知识库，按要求筛选上屏';
export const CHARACTER_REQUIREMENT_PLACEHOLDER =
  '可选：人物姿态/着装；或如「保留步骤示意与要点摘要两个板块，其余精简」';
export const CHARACTER_REQUIREMENT_MAX_LENGTH = 500;
export const PREVIEW_MARK = '预览';
export const RESULT_PLAN_TITLE = '图文内容';
export const RESULT_GENERATE_TITLE = '图文生成';

export const MISSING_INPUT_WARNING = '请上传素材或填写内容';
export const MISSING_BODY_WARNING = '请先生成图文内容';
export const MISSING_PREVIEW_WARNING = '请先勾选要进入预览的图片';
export const PLAN_FAILED = '图文内容生成失败，请稍后重试';
export const PLAN_PARSE_FAILED = '生成结果为空，请重试';
export const GENERATE_FAILED = '图片生成失败，请稍后重试';
export const PERSIST_FAILED = '已更新，但保存失败，刷新后可能丢失';

export const EMPTY_PLAN_HINT = '上传素材或填写内容后点击「生成内容」，将整理成图文卡片正文';
export const EMPTY_GALLERY_HINT = '生成后，图片会按比例出现在这里';
export const EMPTY_PREVIEW_HINT = '还没有勾选预览图片';
export const DEFAULT_GENERATE_CARD_ID = 'image-text';
export const DEFAULT_GENERATE_CARD_TITLE = '图文配图';

export const DEFAULT_IMAGE_MODEL = 'gpt-image-2-vip';
export const DEFAULT_IMAGE_ASPECT = '3:4';
export const DEFAULT_IMAGE_CLARITY = '2K';

export { IMAGE_ASPECT_RATIO_OPTIONS } from '@/app/studio/_utils/model-options';

export const MARKDOWN_DISABLE_STYLES: Array<'code' | 'img'> = ['code', 'img'];
export const MARKDOWN_STREAMING_ON = { hasNextChunk: true };
export const MARKDOWN_STREAMING_OFF = { hasNextChunk: false };
export const MARKDOWN_COMPONENTS = {};
