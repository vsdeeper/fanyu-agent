import 'server-only';

import type { ImageTextPlanRequest } from '../_shared/types';

/** 把素材说明与可选内容拼成图文卡片提示。图片由调用方另作多模态附件。 */
export function buildPlanPrompt(body: ImageTextPlanRequest): string {
  const lines: string[] = [];
  const materialCount = body.materialDataUrls.length;
  const content = body.content?.trim();

  if (materialCount > 0) {
    lines.push(
      `【素材图】共 ${materialCount} 张，见附件。请从图中提炼可讲述的主题与要点，整理进图文卡片正文。`,
    );
  } else {
    lines.push('未上传素材图：请完全依据【内容】整理图文卡片正文。');
  }

  if (content) {
    lines.push('【内容】', content);
  } else {
    lines.push('未填写内容：请只根据素材图整理图文卡片正文。');
  }

  lines.push(
    '请直接输出 Markdown 图文卡片正文（含 # 标题、紧随其后固定格式的 `> 配文摘要`、以及 ## 小节），不要 JSON，不要视觉风格，不要生图提示词。',
  );
  return lines.join('\n');
}
