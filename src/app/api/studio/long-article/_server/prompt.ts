import { LONG_ARTICLE_GENRE_LABEL } from '../_shared/constants';
import type {
  LongArticleDraftRequest,
  LongArticleGenre,
  LongArticleImagesRequest,
  LongArticlePlanRequest,
  LongArticleResearchRequest,
} from '../_shared/types';

/** 文体对应的切入卡 conflict 槽展示名（写入用户提示，与 UI 标签对齐）。 */
function conflictSlotLabel(genre: LongArticleGenre): string {
  switch (genre) {
    case 'commentary':
      return '张力';
    case 'narrative':
      return '处境';
    case 'popular-science':
      return '易混点';
    default:
      return '卡点';
  }
}

/** 调研步按文体附加的用户提示。 */
function researchGenreHint(genre: LongArticleGenre): string {
  switch (genre) {
    case 'narrative':
      return [
        '叙事散文：以【我的经历】或可感处境为叙事主轴产出 3～5 张切入卡（JSON angles）。',
        '四槽填法：claim=故事钩子/开篇画面；conflict=人物处境与进退两难；whyNow=为何值得听这个故事；risk=矫情/卖惨/洩密等边界（可选）。',
        '检索按需、最多 1 轮且全程最多 2 次（每轮并行≤2），只作背景/对照/事实核对；无必要可不搜；sources 可少或空。禁止用外部热点另起无关选题。',
        '简报宜短（几句即可）；末尾必须附含 sources 与 angles 的 ```json 代码块（切入卡不可省略；简报内 Markdown 链接不能代替）。',
        '涉及「今天/新鲜事」须以检索为准。简报第一句就是结论；不要写检索预告或「检索简报」标题。',
      ].join('');
    case 'commentary':
      return [
        '观点评论：请先调用 web_search 联网检索，再输出简报 + 含 sources 与 angles 的 ```json（切入卡 3～5 张，不可省略）。',
        '检索宜少而准：最多 3 轮、全程最多 6 次（每轮并行≤3 个关键词），够写 3～8 条 sources 即可。',
        '四槽填法：claim=核心主张一句；conflict=对立面/争议点；whyNow=为何现在值得发；risk=论据脆弱/易被打脸（可选）。切入围绕用户立场，不要另起一套立场。',
        '涉及「今天/新鲜事」须以检索为准。简报第一句就是结论；不要写检索预告或「检索简报」标题。',
      ].join('');
    case 'popular-science':
      return [
        '科普：请先调用 web_search 联网检索，再输出简报 + 含 sources 与 angles 的 ```json（切入卡 3～5 张，不可省略）。',
        '检索偏事实、例子与常见误解：最多 3 轮、全程最多 6 次（每轮并行≤3 个关键词），够写 3～8 条 sources 即可。',
        '四槽填法：claim=一句话说明路径（是什么/怎么回事）；conflict=读者常见误解/易混点；whyNow=为何现在值得讲清楚；risk=堆砌术语、说明书腔、过度简化失真（可选）。',
        '语气清晰好懂；禁止文学散文腔与「存不存在」辩论式拆台。有【我的经历】时经历只作例子。',
        '涉及「今天/新鲜事」须以检索为准。简报第一句就是结论；不要写检索预告或「检索简报」标题。',
      ].join('');
    default:
      return [
        '知识故事：请先调用 web_search 联网检索，再输出简报 + 含 sources 与 angles 的 ```json（切入卡 3～5 张，不可省略）。',
        '检索偏事实、例子与常见误解：最多 3 轮、全程最多 6 次（每轮并行≤3 个关键词），够写 3～8 条 sources 即可。',
        '四槽填法：claim=故事钩子/开篇画面（带出要讲的知识）；conflict=读者易混点/好奇卡点；whyNow=为何值得读；risk=说教、堆砌、像百科（可选）。',
        '禁止做成百科词条或「存不存在」辩论式拆台。有【我的经历】时经历只作例子，不当整篇主轴。',
        '涉及「今天/新鲜事」须以检索为准。简报第一句就是结论；不要写检索预告或「检索简报」标题。',
      ].join('');
  }
}

/** 构建选题调研用户提示。 */
export function buildResearchPrompt(body: LongArticleResearchRequest): string {
  const today = new Date();
  const todayIso = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  const idea = body.idea?.trim();
  const experience = body.experience?.trim();
  const viewpoint = body.viewpoint?.trim();
  const genreLabel = LONG_ARTICLE_GENRE_LABEL[body.articleGenre];
  const lines = [
    ...(idea ? ['【用户想法】', idea] : []),
    ...(viewpoint ? ['【我的观点】', viewpoint] : []),
    ...(experience ? ['【我的经历】', experience] : []),
    '【文体】',
    genreLabel,
    '【今天日期】',
    todayIso,
    '',
    researchGenreHint(body.articleGenre),
  ];
  return lines.join('\n');
}

/** 格式化选定切入（通用四槽文案；conflict 标签随文体变化）。 */
function formatSelectedAngle(
  angle: LongArticlePlanRequest['angle'],
  genre: LongArticleGenre,
): string[] {
  return [
    '【选定切入】',
    `切入：${angle.claim}`,
    `${conflictSlotLabel(genre)}：${angle.conflict}`,
    `读者理由：${angle.whyNow}`,
    ...(angle.risk ? [`注意：${angle.risk}`] : []),
  ];
}

/** 思路步按文体附加的用户提示。 */
function planGenreHint(genre: LongArticleGenre): string {
  switch (genre) {
    case 'narrative':
      return '请输出轻量内容思路：文体为叙事散文；有【我的经历】时以经历为叙事主轴；beats 写成故事节拍（场景→转折→余味），禁止论点大纲；JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）。';
    case 'commentary':
      return '请输出轻量内容思路：文体为观点评论；beats 写成论证要点（主张→理由→反方→取舍）；JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）；不要写长文或分节大纲。';
    case 'popular-science':
      return '请输出轻量内容思路：文体为科普；beats 写成说明节拍（是什么→易混点→例子/对照→清楚结论），清晰好懂，禁止文学散文骨架与存废辩论；JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）。';
    default:
      return '请输出轻量内容思路：文体为知识故事；beats 写成故事化科普节拍（场景钩子→澄清易混点→可感结论），禁止百科大纲与存废辩论骨架；JSON 外最多两句导语，随即附完整 JSON（含 beats，以及至少 3 条 titleDirections）。';
  }
}

/** 构建内容思路用户提示。 */
export function buildPlanPrompt(body: LongArticlePlanRequest): string {
  const sources = body.sources
    .map((item, index) => {
      const date = item.publishedAt?.trim();
      return `${index + 1}. [${item.kind}] ${item.title}${date ? `（${date}）` : ''} (${item.url})\n${item.blurb}`;
    })
    .join('\n');
  const idea = body.idea?.trim();
  const experience = body.experience?.trim();
  const genreLabel = LONG_ARTICLE_GENRE_LABEL[body.articleGenre];
  return [
    ...(idea ? ['【用户想法】', idea] : []),
    ...(experience ? ['【我的经历】', experience] : []),
    '【文体】',
    genreLabel,
    ...formatSelectedAngle(body.angle, body.articleGenre),
    '【参考来源】',
    sources || '（无）',
    ...(body.lengthLimit
      ? [
          '【篇幅】',
          `成稿正文去掉空白后不少于 ${body.lengthLimit} 字；按该篇幅选择 beats 条数与展开粒度（≤2000→3～4；2001～3499→4～5；≥3500→5～6）。`,
        ]
      : []),
    '',
    planGenreHint(body.articleGenre),
  ].join('\n');
}

/** 成稿步按文体附加的写法约束。 */
function draftGenreRule(genre: LongArticleGenre): string {
  switch (genre) {
    case 'narrative':
      return '以【我的经历】或可感处境为叙事主轴讲故事（场景与细节优先），勿用外部资讯另起故事或写成纯观点文；';
    case 'commentary':
      return '按观点评论写：立主张、给理由、接反方，落到取舍；勿写成中立综述或百科；';
    case 'popular-science':
      return '按科普写：把概念讲清楚，例子与对照服务说明；语气清晰好懂，可略轻松；禁止文学散文腔、零聚焦实验写法与存废辩论拆台；有经历时经历只作例子；';
    default:
      return '按知识故事写：用具体场景把知识讲清楚，有味可感；禁止百科说明书腔与存废辩论拆台；有经历时经历只作例子；';
  }
}

/** 构建成稿用户提示。 */
export function buildDraftPrompt(body: LongArticleDraftRequest): string {
  const idea = body.idea?.trim();
  const experience = body.experience?.trim();
  const genreLabel = LONG_ARTICLE_GENRE_LABEL[body.articleGenre];
  const title = body.plan.title?.trim();
  const titleRule = title
    ? `第一行必须是 \`# ${title}\`（标题已定，勿改写），空一行后写正文；`
    : '';
  return [
    ...(idea ? ['【用户想法】', idea] : []),
    ...(experience ? ['【我的经历】', experience] : []),
    '【文体】',
    genreLabel,
    ...formatSelectedAngle(body.angle, body.articleGenre),
    '【内容思路】',
    '要点：',
    ...body.plan.beats.map((beat, index) => `${index + 1}. ${beat}`),
    ...(title ? ['【标题】', title] : []),
    '【文风】',
    body.stylePrompt.trim(),
    ...(body.lengthLimit
      ? ['【篇幅】', `正文去掉空白后不少于 ${body.lengthLimit} 字；写够要点与展开，勿敷衍短写。`]
      : []),
    ...(body.plan.audience ? ['【受众】', body.plan.audience] : []),
    '',
    `请写长文正文 Markdown：${titleRule}${draftGenreRule(body.articleGenre)}正文须含若干 \`## \` 段落标题，节内用空行分段；禁止无小标题的通篇白文或整篇连成一大段；不要输出配图槽或配图标注。`,
  ].join('\n');
}

/** 构建成稿配图规划用户提示。 */
export function buildImagesPrompt(body: LongArticleImagesRequest): string {
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
