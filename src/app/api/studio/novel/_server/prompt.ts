import 'server-only';

import type {
  NovelCast,
  NovelCastRequest,
  NovelCharacterArc,
  NovelCharacterGender,
  NovelCharacterRole,
  NovelPlan,
  NovelPlanRequest,
  NovelPolishRequest,
  NovelRelationArc,
  NovelResearchRequest,
  NovelTense,
  NovelThread,
  NovelVolumeChaptersRequest,
  NovelVolumeOutline,
  NovelWorldview,
  NovelWritingRequest,
} from '../_shared/types';

const ROLE_LABEL: Record<NovelCharacterRole, string> = {
  protagonist: '主角',
  antagonist: '对手',
  supporting: '配角',
};

const GENDER_LABEL: Record<NovelCharacterGender, string> = {
  female: '女',
  male: '男',
};

const TENSE_LABEL: Record<NovelTense, string> = {
  past: '过去时',
  present: '现在时',
};

const RELATION_ARC_LABEL: Record<keyof NovelRelationArc, string> = {
  early: '初期',
  mid: '中期',
  late: '后期',
};

function formatRelationArc(arc: NovelRelationArc | undefined): string {
  if (!arc) return '';
  const parts = (Object.keys(RELATION_ARC_LABEL) as (keyof NovelRelationArc)[])
    .map((key) => {
      const text = arc[key]?.trim();
      return text ? `${RELATION_ARC_LABEL[key]}：${text}` : '';
    })
    .filter(Boolean);
  return parts.length > 0 ? `（${parts.join('；')}）` : '';
}

const ARC_LABEL: Record<keyof NovelCharacterArc, string> = {
  early: '初期',
  mid: '中期',
  late: '后期',
  end: '终局',
};

/** 已抽出的文件正文，以及待附件阅读的 PDF 份数。 */
export type IdeaFilePrompt = {
  documentsText?: string;
  pdfCount?: number;
};

/** 把想法写进提示。只填了文件时明确告诉模型以文件为准。 */
function pushIdea(lines: string[], idea: string | undefined) {
  const text = idea?.trim() ?? '';
  if (text) lines.push(`我的想法：${text}`);
  else lines.push('我的想法：（未填写，以体系设定为准）');
}

/** 把一类上传文件写进提示。 */
function pushFileBlock(lines: string[], label: string, file?: IdeaFilePrompt) {
  const doc = file?.documentsText?.trim();
  if (doc) lines.push(`【${label}】`, doc);
  const pdfCount = file?.pdfCount ?? 0;
  if (pdfCount > 0) {
    lines.push(`【${label}】${pdfCount} 份 PDF，见附件。请直接阅读正文。`);
  }
}

function formatArc(arc: NovelCharacterArc | undefined): string {
  if (!arc) return '';
  const parts = (Object.keys(ARC_LABEL) as (keyof NovelCharacterArc)[])
    .map((key) => {
      const text = arc[key]?.trim();
      return text ? `${ARC_LABEL[key]}：${text}` : '';
    })
    .filter(Boolean);
  return parts.length > 0 ? `｜变化：${parts.join('；')}` : '';
}

/** 把角色设定压成后续步骤共用的短文本。 */
export function formatCastPrompt(cast: NovelCast): string {
  const names = new Map(cast.characters.map((character) => [character.id, character.name]));
  const characters = cast.characters
    .map((character) => {
      const gender = character.gender ? GENDER_LABEL[character.gender] : '未填写';
      return `- ${character.name}｜${ROLE_LABEL[character.role]}｜${gender}｜出身：${character.origin}｜特质：${character.trait}${formatArc(character.arc)}`;
    })
    .join('\n');
  const relations =
    cast.relations.length > 0
      ? cast.relations
          .map((relation) => {
            const from = names.get(relation.fromId) ?? relation.fromId;
            const to = names.get(relation.toId) ?? relation.toId;
            return `- ${from} — ${relation.label}${formatRelationArc(relation.arc)} — ${to}`;
          })
          .join('\n')
      : '无';
  return ['【角色设定】', '人物：', characters, '关系：', relations].join('\n');
}

/** 把世界观压成后续步骤能读的短文本。 */
function formatWorldview(worldview: NovelWorldview): string {
  const orders =
    worldview.orders.length > 0
      ? worldview.orders
          .map((order) => {
            const entries = order.entries
              .map((entry) => `  - ${entry.name}：${entry.rule}`)
              .join('\n');
            return `- ${order.name}：${order.question}${entries ? `\n${entries}` : ''}`;
          })
          .join('\n')
      : '无';
  const assets =
    worldview.assets.length > 0
      ? worldview.assets
          .map((group) => `- ${group.category}：${group.items.join('、') || '无'}`)
          .join('\n')
      : '无';
  return [
    '世界观：',
    '秩序：',
    orders,
    `隐藏真相：${worldview.hiddenTruth.trim() || '未写'}`,
    '物质基础：',
    assets,
  ].join('\n');
}

function formatVolumeAssets(volume: NovelVolumeOutline): string {
  if (volume.assets.length === 0) return '无';
  return volume.assets.map((asset) => `${asset.name}（${asset.use}）`).join('；');
}

/** 把创作方案压成后续步骤共用的文本。 */
export function formatPlanPrompt(plan: NovelPlan): string {
  const threads = plan.threads.map((thread) => formatThread(thread)).join('\n');
  const volumes = plan.volumes
    .map((volume, index) => `${index + 1}. ${formatVolumeBody(volume)}`)
    .join('\n');
  return [
    '【创作方案】',
    formatWorldview(plan.worldview),
    '主线：',
    threads || '无',
    `终局：${plan.ending.trim() || '未写'}`,
    `主题：${plan.theme.trim() || '未写'}`,
    '分卷：',
    volumes || '无',
  ].join('\n');
}

function formatThread(thread: NovelThread): string {
  return `- ${thread.name}：${thread.core}`;
}

/** 按目标字数给出本卷应铺满的章数区间。 */
export function chapterCountHint(targetChars: number): string {
  if (targetChars >= 2000) {
    const min = Math.max(1, Math.round(targetChars / 5000));
    const max = Math.max(min, Math.round(targetChars / 2000));
    return `约 ${min}～${max} 章（本卷目标 ${targetChars} 字，单章 2000～5000 字）`;
  }
  return '按本卷冲突从开卷写到交给下一卷，单章约 2000～5000 字';
}

function formatVolumeBody(volume: NovelVolumeOutline): string {
  return `[${volume.id}] ${volume.title}｜地图：${volume.geography}｜冲突：${volume.conflict}｜人物推进：${volume.relations.trim() || '未写'}｜要素：${formatVolumeAssets(volume)}｜卷末钩子：${volume.hook.trim() || '未写'}｜目标 ${volume.targetChars} 字`;
}

function formatVolumeLine(volume: NovelVolumeOutline): string {
  return `- ${formatVolumeBody(volume)}`;
}

/** 拼装选题调研用户提示。 */
export function buildResearchPrompt(
  body: NovelResearchRequest,
  systemFile?: IdeaFilePrompt,
  planFile?: IdeaFilePrompt,
): string {
  const genres =
    body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定（可自由发挥）';
  const lines: string[] = [];
  pushIdea(lines, body.idea);
  pushFileBlock(lines, '体系设定', systemFile);
  pushFileBlock(lines, '创作方案文件', planFile);
  lines.push(`偏好类型：${genres}`, '体裁：网文长篇', '请产出 3～5 张选题卡，末尾附 topics JSON。');
  return lines.join('\n');
}

/** 拼装创作方案用户提示。 */
export function buildPlanPrompt(
  body: NovelPlanRequest,
  systemFile?: IdeaFilePrompt,
  planFile?: IdeaFilePrompt,
): string {
  const genres = body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定';
  const risk = body.topic.risk ? `\n风险/难点：${body.topic.risk}` : '';
  const lines: string[] = [];
  pushIdea(lines, body.idea);
  pushFileBlock(lines, '体系设定', systemFile);
  pushFileBlock(lines, '创作方案文件', planFile);
  lines.push(
    `偏好类型：${genres}`,
    `选定选题：${body.topic.title}`,
    `类型：${body.topic.genreVolume}`,
    `为什么值得写：${body.topic.why}`,
    `故事核：${body.topic.core}${risk}`,
    '请输出世界观、2～4 条主线、终局、主题与分卷（约 5～8 卷，含终卷；已写明的保持，未写明的按需扩展；不要写章节），末尾附 JSON。',
  );
  return lines.join('\n');
}

/** 拼装角色设定用户提示。 */
export function buildCastPrompt(
  body: NovelCastRequest,
  systemFile?: IdeaFilePrompt,
  planFile?: IdeaFilePrompt,
): string {
  const genres = body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定';
  const risk = body.topic.risk ? `\n风险/难点：${body.topic.risk}` : '';
  const lines: string[] = [];
  pushIdea(lines, body.idea);
  pushFileBlock(lines, '体系设定', systemFile);
  pushFileBlock(lines, '创作方案文件', planFile);
  lines.push(
    `偏好类型：${genres}`,
    `选定选题：${body.topic.title}`,
    `类型：${body.topic.genreVolume}`,
    `为什么值得写：${body.topic.why}`,
    `故事核：${body.topic.core}${risk}`,
    formatPlanPrompt(body.plan),
    '规模：核心人物约 12～20 人。',
    '请直接输出人物与关系的 JSON，不要前言。不要写人称、聚焦或时态。',
  );
  return lines.join('\n');
}

/** 拼装按卷章卡用户提示。 */
export function buildVolumeChaptersPrompt(
  body: NovelVolumeChaptersRequest,
  systemFile?: IdeaFilePrompt,
  planFile?: IdeaFilePrompt,
): string {
  const siblings =
    body.siblingVolumes && body.siblingVolumes.length > 0
      ? ['同书其它卷：', ...body.siblingVolumes.map(formatVolumeLine)].join('\n')
      : '同书其它卷：无';
  const threadLines = body.plan.threads.map((thread) => `- ${thread.name}：${thread.core}`);
  const lines: string[] = [];
  pushFileBlock(lines, '体系设定', systemFile);
  pushFileBlock(lines, '创作方案文件', planFile);
  lines.push(
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    formatCastPrompt(body.cast),
    '本卷相关主线：',
    threadLines.join('\n') || '无',
    `本卷 id：${body.volume.id}`,
    `本卷标题：${body.volume.title}`,
    `地图：${body.volume.geography}`,
    `核心冲突：${body.volume.conflict}`,
    `人物推进：${body.volume.relations.trim() || '未写'}`,
    `本卷要素：${formatVolumeAssets(body.volume)}`,
    `卷末钩子：${body.volume.hook.trim() || '未写'}`,
    `目标字数：${body.volume.targetChars}`,
    siblings,
    `请为本卷一次出齐全部章卡（${chapterCountHint(body.volume.targetChars)}）。场景和事件写成一小段，末尾附 chapters JSON。`,
  );
  return lines.join('\n');
}

/** 拼装正文写作用户提示。此前各章全文原样进入。写作不再附体系设定或创作方案原文。 */
export function buildWritingPrompt(body: NovelWritingRequest): string {
  const lines = [
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    formatPlanPrompt(body.plan),
    formatCastPrompt(body.cast),
    `时态：${TENSE_LABEL[body.tense]}`,
  ];
  if (body.stylePrompt?.trim()) {
    lines.push('【文风】', body.stylePrompt.trim());
  }
  if (body.previousChapters.length > 0) {
    lines.push('【此前各章】按顺序。已有正文以全文为准。');
    body.previousChapters.forEach((chapter, index) => {
      lines.push(
        `第${index + 1}章 ${chapter.title}`,
        `场景：${chapter.scene}`,
        `事件：${chapter.event}`,
        `钩子：${chapter.hook}`,
      );
      if (chapter.body?.trim()) {
        lines.push('全文：', chapter.body.trim());
      } else {
        lines.push('全文：（尚未写下）');
      }
    });
  } else {
    lines.push('【此前各章】无（这是全书第一章）');
  }
  lines.push(
    '【当前章】',
    `正文 unitId：${body.unitId}`,
    `标题：${body.chapter.title}`,
    `场景：${body.chapter.scene}`,
    `事件：${body.chapter.event}`,
    `钩子：${body.chapter.hook}`,
  );
  if (body.nextChapter) {
    lines.push(
      '【下一章边界】不要提前写掉这一章的钩子。',
      `标题：${body.nextChapter.title}`,
      `钩子：${body.nextChapter.hook}`,
    );
  }
  lines.push(
    '请一次写完当前章正文（约 2000～5000 字）。写出场景里的事件，落到本章钩子再收束；从此前章节自然续写，不要复述；自然段之间只换一行，不要留空白行。',
  );
  return lines.join('\n');
}

/** 拼装整章通顺润色用户提示。 */
export function buildPolishPrompt(body: NovelPolishRequest): string {
  const style = body.stylePrompt?.trim();
  return [
    ...(body.label ? ['【正文单元】', body.label] : []),
    ...(body.scene ? ['【场景】', body.scene] : []),
    ...(body.event ? ['【事件】', body.event] : []),
    ...(body.hook ? ['【钩子】', body.hook] : []),
    ...(style ? ['【文风】', style] : []),
    '【原文】',
    body.body.trim(),
    '',
    '请输出润色后的整章正文（修正段落衔接、重复、句读、不当搭配、主谓错位、指称偷换与半吊子术语；不改情节、对话内容与人称；自然段之间只换一行，不要留空白行；不要标题、说明或代码块）。',
  ].join('\n');
}
