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
  const idea = body.idea?.trim();
  const experience = body.experience?.trim();
  const viewpoint = body.viewpoint?.trim();
  const lines = [
    ...(idea ? ['【用户想法】', idea] : []),
    ...(experience ? ['【我的经历】', experience] : []),
    ...(viewpoint ? ['【我的观点】', viewpoint] : []),
    '【今天日期】',
    todayIso,
    '',
    experience
      ? '用户给出了亲身经历：调研与角度须以这段经历为叙事主轴，检索只作背景/对照/时效补充，禁止用外部热点另起一套与经历无关的选题。请先调用 web_search 联网检索（不限国内外；权威可核对并兼顾时效），再输出：简报正文，并在末尾附上含 sources 与 angles 的 ```json 代码块（角度卡 3～5 张，不可省略；简报内 Markdown 链接不能代替该 JSON）。涉及「今天/新鲜事」时必须以检索结果为准，禁止用记忆编造。简报第一句就是结论；不要写 I will search / 我先搜 等预告，不要写「检索简报」标题，不要写检索过程。'
      : '请先调用 web_search 联网检索（不限国内外；权威可核对并兼顾时效），再输出：简报正文，并在末尾附上含 sources 与 angles 的 ```json 代码块（角度卡 3～5 张，不可省略；简报内 Markdown 链接不能代替该 JSON）。涉及「今天/新鲜事」时必须以检索结果为准，禁止用记忆编造。简报第一句就是结论；不要写 I will search / 我先搜 等预告，不要写「检索简报」标题，不要写检索过程。',
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
  const idea = body.idea?.trim();
  const experience = body.experience?.trim();
  return [
    ...(idea ? ['【用户想法】', idea] : []),
    ...(experience ? ['【我的经历】', experience] : []),
    '【选定角度】',
    `判断：${body.angle.claim}`,
    `冲突：${body.angle.conflict}`,
    `为何现在写：${body.angle.whyNow}`,
    ...(body.angle.risk ? [`风险：${body.angle.risk}`] : []),
    '【参考来源】',
    sources || '（无）',
    '',
    experience
      ? '请输出轻量内容思路：以【我的经历】为叙事主轴；JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）；不要写长文或分节大纲。'
      : '请输出轻量内容思路：JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）；不要写长文或分节大纲。',
  ].join('\n');
}

/** 构建成稿用户提示。 */
export function buildDraftPrompt(body: WechatArticleDraftRequest): string {
  const idea = body.idea?.trim();
  const experience = body.experience?.trim();
  return [
    ...(idea ? ['【用户想法】', idea] : []),
    ...(experience ? ['【我的经历】', experience] : []),
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
      ? ['【篇幅】', `正文去掉空白后不少于 ${body.lengthLimit} 字；写够要点与展开，勿敷衍短写。`]
      : []),
    ...(body.plan.audience ? ['【受众】', body.plan.audience] : []),
    '',
    experience
      ? body.plan.title?.trim()
        ? `请写公众号正文 Markdown：第一行必须是 \`# ${body.plan.title.trim()}\`（标题已定，勿改写），空一行后写正文；以【我的经历】为叙事主轴，勿用外部资讯另起故事；正文须含若干 \`## \` 段落标题，节内用空行分段；禁止无小标题的通篇白文或整篇连成一大段；不要输出配图槽或配图标注。`
        : '请写公众号正文 Markdown；以【我的经历】为叙事主轴，勿用外部资讯另起故事；正文须含若干 `## ` 段落标题，节内用空行分段；禁止无小标题的通篇白文或整篇连成一大段；不要输出配图槽或配图标注。'
      : body.plan.title?.trim()
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
          '消息中附带一张风格参考图：请据此锁定 visualStyle（媒介/画风、色调、光影、质感；有人物则统一人物形象），各槽 promptDraft 服从之，禁止另起冲突风格；参考图若含人像，只对齐画风与人物气质，不得复刻其相貌。',
        ]
      : []),
    '',
    '请按正文需要自行决定配图数量（建议 2～6，含封面），在合适位置插入独立成行的【配图：标签】标注（必须含「封面」）；正文后附 JSON（必含 visualStyle：统一画风 + 若有人物则锁定统一中国语境人物形象，禁止中西混用；以及 imageSlots）；各槽 promptDraft 服从同一风格与人物设定；**画风须干净、清爽且简洁、高级**（留白是有意图的负空间而非空荡，画面讲究质感与光影层次，配色克制而高级；禁止扁平矢量插画、细描边涂鸦、PPT 与素材库风的扁平小人；用摄影质感时须是布光讲究、背景干净、设计过的商业质感，禁止纪实、新闻、抓拍、生活随拍那种随手一拍的味道，简洁不等于简陋）；人物以中国人为主，一律按虚构、非特指的普通人写：不指涉真实人物（公众人物、明星网红等），不写具体五官与身材，不写暴露、性化或政治、宗教、民族、军警等敏感设定；**画面不得出现清晰可辨的人物面容**（优先无人物；必要时用背影、侧影、剪影、远景、局部或虚化、遮挡处理），每槽 promptDraft 写明本张人物以何种方式不露脸；不要声称已出图。',
  ].join('\n');
}
