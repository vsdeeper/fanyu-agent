import type {
  WechatArticleDraftRequest,
  WechatArticleImagesRequest,
  WechatArticlePlanRequest,
  WechatArticleResearchRequest,
} from '../_shared/types';

/** 构建选题调研用户提示。 */
export function buildResearchPrompt(body: WechatArticleResearchRequest): string {
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const lines = [
    '【用户想法】',
    body.idea.trim(),
    ...(body.viewpoint?.trim() ? ['【我的观点】', body.viewpoint.trim()] : []),
    '【今天日期】',
    todayIso,
    '',
    '请先调用 web_search 联网检索（不限国内外；权威可核对并兼顾时效），再输出：简报正文 + 带真实链接与日期的参考来源 + 角度卡。涉及「今天/新鲜事」时必须以检索结果为准，禁止用记忆编造。简报第一句就是结论；不要写 I will search / 我先搜 等预告，不要写「检索简报」标题，不要写检索过程。',
  ];
  return lines.join('\n');
}

/** 构建内容思路用户提示。 */
export function buildPlanPrompt(body: WechatArticlePlanRequest): string {
  const sources = body.sources
    .map((item, index) => {
      const date = item.publishedAt?.trim();
      return `${index + 1}. [${item.kind}] ${item.title}${date ? `（${date}）` : ''} (${item.url})\n${item.blurb}`;
    })
    .join('\n');
  return [
    '【用户想法】',
    body.idea.trim(),
    '【选定角度】',
    `判断：${body.angle.claim}`,
    `冲突：${body.angle.conflict}`,
    `为何现在写：${body.angle.whyNow}`,
    ...(body.angle.risk ? [`风险：${body.angle.risk}`] : []),
    '【参考来源】',
    sources || '（无）',
    '',
    '请输出轻量内容思路：JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）；不要写长文或分节大纲。',
  ].join('\n');
}

/** 构建成稿用户提示。 */
export function buildDraftPrompt(body: WechatArticleDraftRequest): string {
  return [
    '【用户想法】',
    body.idea.trim(),
    '【选定角度】',
    `判断：${body.angle.claim}`,
    `冲突：${body.angle.conflict}`,
    `为何现在写：${body.angle.whyNow}`,
    '【内容思路】',
    '要点：',
    ...body.plan.beats.map((beat, index) => `${index + 1}. ${beat}`),
    ...(body.plan.title?.trim() ? ['【标题】', body.plan.title.trim()] : []),
    '【文风】',
    body.stylePrompt.trim(),
    ...(body.lengthLimit
      ? [
          '【篇幅】',
          `正文去掉空白后不少于 ${body.lengthLimit} 字；写够要点与展开，勿敷衍短写。`,
        ]
      : []),
    ...(body.plan.audience ? ['【受众】', body.plan.audience] : []),
    '',
    body.plan.title?.trim()
      ? `请写公众号正文 Markdown：第一行必须是 \`# ${body.plan.title.trim()}\`（标题已定，勿改写），空一行后写正文；正文须含若干 \`## \` 段落标题，节内用空行分段；禁止无小标题的通篇白文或整篇连成一大段；不要输出配图槽或配图标注。`
      : '请写公众号正文 Markdown；正文须含若干 `## ` 段落标题，节内用空行分段；禁止无小标题的通篇白文或整篇连成一大段；不要输出配图槽或配图标注。',
  ].join('\n');
}

/** 构建成稿配图规划用户提示。 */
export function buildImagesPrompt(body: WechatArticleImagesRequest): string {
  const hasStyleRef = Boolean(body.styleReferenceDataUrl?.trim());
  return [
    '【正文 Markdown】',
    body.markdown.trim(),
    ...(body.title?.trim() ? ['【标题】', body.title.trim()] : []),
    ...(hasStyleRef
      ? [
          '【风格参考图】',
          '消息中附带一张风格参考图：请据此锁定 visualStyle（媒介/画风、色调、光影、质感；有人物则统一人物形象），各槽 promptDraft 服从之，禁止另起冲突风格。',
        ]
      : []),
    '',
    '请按正文需要自行决定配图数量（建议 2～6，含封面），在合适位置插入独立成行的【配图：标签】标注（必须含「封面」）；正文后附 JSON（必含 visualStyle：统一画风 + 若有人物则锁定统一东亚/中国语境人物形象，禁止中西混用；以及 imageSlots）；各槽 promptDraft 服从同一风格与人物设定；不要声称已出图。',
  ].join('\n');
}
