import type { StudioPhase } from './types';

export const STUDIO_STEPS = [{ title: '商业分析' }, { title: '预览生成物料' }];

export const STUDIO_STEP_INDEX: Record<StudioPhase, number> = {
  input: 0,
  analyzing: 0,
  analyzed: 0,
  complete: 1,
};

export const NO_IMAGE_WARNING = '请先上传产品图';
export const ANALYZE_BUTTON = '开始分析';
export const ANALYZE_FAILED = '产品分析失败，请稍后重试';
export const EMPTY_RESULT_HINT = '上传产品资料和产品图，点击「开始分析」开始';
export const RESULT_TITLE_ANALYSIS = '分析结果';
export const PREV_BUTTON = '上一步';
export const COMPLETE_BUTTON = '完成';
export const EXPORT_MATERIALS_BUTTON = '导出生成物料';
export const EXPORT_ARCHIVE_NAME = '商业分析结果.zip';
export const EXPORT_FAILED = '导出失败，请稍后重试';
export const ANALYSIS_FILE_NAME = '商业分析.md';
export const ANALYSIS_MEDIA_TYPE = 'text/markdown;charset=utf-8';
export const ANALYSIS_GROUP_TITLE = '商业分析';
export const COMPLETION_TITLE = '预览生成物料';
