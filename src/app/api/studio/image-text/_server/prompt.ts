import 'server-only';

import type { ImageTextPlanRequest } from '../_shared/types';

type BuildPlanPromptOptions = {
  /** 已从 TXT/MD 抽出的正文；空串表示无可用文本素材。 */
  documentsText?: string;
  /** PDF 附件份数；由调用方另作多模态 file part。 */
  pdfCount?: number;
};

/** 把素材说明与可选内容拼成图文卡片提示。图片与 PDF 由调用方另作多模态附件。 */
export function buildPlanPrompt(
  body: ImageTextPlanRequest,
  options: BuildPlanPromptOptions = {},
): string {
  const lines: string[] = [];
  const materialCount = body.materialDataUrls.length;
  const documentsText = options.documentsText?.trim();
  const pdfCount = options.pdfCount ?? 0;
  const content = body.content?.trim();
  const hasTextDocuments = Boolean(documentsText);
  const hasFileMaterials = hasTextDocuments || pdfCount > 0;

  if (materialCount > 0) {
    lines.push(
      `【素材图】共 ${materialCount} 张，见附件。请从图中提炼可讲述的主题与要点，整理进图文卡片正文。`,
    );
  }

  if (hasTextDocuments) {
    lines.push('【文本素材】', documentsText!);
  }

  if (pdfCount > 0) {
    lines.push(
      `【PDF 素材】共 ${pdfCount} 份，见附件。请直接阅读 PDF 正文，提炼可讲述的主题与要点。`,
    );
  }

  if (content) {
    lines.push('【内容】', content);
  }

  if (materialCount === 0 && !hasFileMaterials && content) {
    lines.push('未上传素材图与素材文件：请完全依据【内容】整理图文卡片正文。');
  } else if (materialCount === 0 && hasFileMaterials && !content) {
    lines.push('未上传素材图、未填写内容：请只根据素材文件整理图文卡片正文。');
  } else if (materialCount > 0 && !hasFileMaterials && !content) {
    lines.push('未上传素材文件、未填写内容：请只根据素材图整理图文卡片正文。');
  }

  lines.push(
    '请直接输出 Markdown 图文卡片正文：从所给内容自动提取的 # 主标题（穴名后内容不限制）、紧随其后自动提取的 `> 摘要`（写法不限制）、以及 ## 小节；所有标题均不要拼音注音；成品勿出现「素材」二字。不要 JSON，不要视觉风格，不要生图提示词。摘要不属于出图文案。',
  );
  return lines.join('\n');
}
