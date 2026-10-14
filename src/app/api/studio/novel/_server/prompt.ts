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
  NovelSection,
  NovelVolumeChaptersRequest,
  NovelVolumeDesign,
  NovelVolumesRequest,
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

function formatBlock(section: NovelSection): string {
  return section.blocks
    .map(
      (block) => `  - ${block.title.trim() ? `${block.title.trim()}：` : ''}${block.body.trim()}`,
    )
    .join('\n');
}

/** 把通用两级章节压成提示文本。 */
export function formatSectionsPrompt(label: string, sections: NovelSection[]): string {
  const body =
    sections.length > 0
      ? sections
          .map((section) => {
            const blocks = formatBlock(section);
            return `## ${section.title.trim() || '未命名'}${blocks ? `\n${blocks}` : ''}`;
          })
          .join('\n')
      : '无';
  return [`【${label}】`, body].join('\n');
}

/** 旧方案里内嵌的世界观压成短文本。 */
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

/** 旧方案残留的主线、终局与主题，仍供下游阅读；新方案没有这几块。 */
function formatLegacyPlanExtras(plan: NovelPlan): string[] {
  const lines: string[] = [];
  if (plan.threads && plan.threads.length > 0) {
    lines.push('主线：', ...plan.threads.map((thread) => `- ${thread.name}：${thread.core}`));
  }
  if (plan.ending?.trim()) lines.push(`终局：${plan.ending.trim()}`);
  if (plan.theme?.trim()) lines.push(`主题：${plan.theme.trim()}`);
  if (plan.worldview) lines.push(formatWorldview(plan.worldview));
  return lines;
}

/** 把创作方案压成后续步骤共用的文本。 */
export function formatPlanPrompt(plan: NovelPlan): string {
  return [formatSectionsPrompt('创作方案', plan.sections), ...formatLegacyPlanExtras(plan)].join(
    '\n',
  );
}

/** 拼装世界观设定用户提示。附件正文与 PDF 说明由调用方传入。 */
export function buildWorldviewPrompt(file?: IdeaFilePrompt): string {
  const lines: string[] = [];
  pushFileBlock(lines, '世界观设定附件', file);
  lines.push(
    '请把附件整理成能装下全文的两级章节：改进矛盾和不合理之处，做整理和精简，并按需补上缺的部分；已经写明的内容保留。末尾附 sections JSON。',
  );
  return lines.join('\n');
}

/** 拼装选题调研用户提示。 */
export function buildResearchPrompt(body: NovelResearchRequest, planFile?: IdeaFilePrompt): string {
  const genres =
    body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定（可自由发挥）';
  const lines: string[] = [];
  lines.push(formatSectionsPrompt('世界观章节', body.worldview));
  pushFileBlock(lines, '创作方案文件', planFile);
  lines.push(`偏好类型：${genres}`, '体裁：网文长篇', '请产出 3～5 张选题卡，末尾附 topics JSON。');
  return lines.join('\n');
}

/** 拼装创作方案用户提示。 */
export function buildPlanPrompt(body: NovelPlanRequest, planFile?: IdeaFilePrompt): string {
  const genres = body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定';
  const risk = body.topic.risk ? `\n风险/难点：${body.topic.risk}` : '';
  const lines: string[] = [];
  lines.push(formatSectionsPrompt('世界观章节', body.worldview));
  pushFileBlock(lines, '创作方案文件', planFile);
  lines.push(
    `偏好类型：${genres}`,
    `选定选题：${body.topic.title}`,
    `类型：${body.topic.genreVolume}`,
    `为什么值得写：${body.topic.why}`,
    `故事核：${body.topic.core}${risk}`,
    '请按世界观与选定选题写出两级章节的创作方案（有样本就改进补缺，没写到的按长篇需要补全；不要写章节），末尾附 sections JSON。',
  );
  return lines.join('\n');
}

/** 拼装角色设定用户提示。 */
export function buildCastPrompt(body: NovelCastRequest): string {
  const risk = body.topic.risk ? `\n风险/难点：${body.topic.risk}` : '';
  const lines: string[] = [];
  lines.push(
    formatSectionsPrompt('世界观章节', body.worldview),
    formatPlanPrompt(body.plan),
    `选定选题：${body.topic.title}`,
    `类型：${body.topic.genreVolume}`,
    `为什么值得写：${body.topic.why}`,
    `故事核：${body.topic.core}${risk}`,
    '规模：核心人物约 12～20 人。',
    '请直接输出人物与关系的 JSON，不要前言。不要写人称或聚焦。',
  );
  return lines.join('\n');
}

/** 把一卷的节拍压成后续步骤能读的短文本。角色 id 换成姓名。 */
function formatVolumeBeats(volume: NovelVolumeDesign, cast: NovelCast): string[] {
  const names = new Map(cast.characters.map((character) => [character.id, character.name]));
  return volume.beats.map((beat, index) => {
    const who = beat.characterIds
      .map((id) => names.get(id) ?? id)
      .filter(Boolean)
      .join('、');
    return `${index + 1}. [${beat.id}] ${beat.title}${who ? `（${who}）` : ''}：${beat.event}`;
  });
}

/** 把一卷卷纲压成提示文本。 */
export function formatVolumePrompt(volume: NovelVolumeDesign, cast: NovelCast): string {
  const beats = formatVolumeBeats(volume, cast);
  return [
    `## [${volume.id}] ${volume.title}`,
    `核心冲突：${volume.conflict.trim() || '未写'}`,
    `卷末钩子：${volume.hook.trim() || '未写'}`,
    '节拍（按时间）：',
    ...(beats.length > 0 ? beats : ['无']),
  ].join('\n');
}

/** 拼装卷纲用户提示。 */
export function buildVolumesPrompt(body: NovelVolumesRequest): string {
  const lines: string[] = [];
  lines.push(
    formatSectionsPrompt('世界观章节', body.worldview),
    formatPlanPrompt(body.plan),
    formatCastPrompt(body.cast),
    `选定选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    '请把全书排成叙事卷：只收叙事卷，节拍按时间写清这一拍发生的事，characterIds 只用角色设定里的 id，末尾附 volumes JSON。',
  );
  return lines.join('\n');
}

/** 拼装按卷章卡用户提示。 */
export function buildVolumeChaptersPrompt(body: NovelVolumeChaptersRequest): string {
  const siblings =
    body.siblingVolumes && body.siblingVolumes.length > 0
      ? [
          '同书其它卷（只有标题与卷末钩子，用来卡住边界）：',
          ...body.siblingVolumes.map(
            (volume) => `- ${volume.title}｜卷末钩子：${volume.hook.trim() || '未写'}`,
          ),
        ].join('\n')
      : '同书其它卷：无';
  const lines: string[] = [];
  lines.push(
    formatSectionsPrompt('世界观章节', body.worldview),
    formatPlanPrompt(body.plan),
    formatCastPrompt(body.cast),
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    '本卷卷纲：',
    formatVolumePrompt(body.volume, body.cast),
    siblings,
    '请按本卷节拍顺序一次出齐全部章卡（一拍可展开成一章或多章，单章 2000～5000 字）。场景和事件写成一小段，末尾附 chapters JSON。',
  );
  return lines.join('\n');
}

/** 拼装正文写作用户提示。此前各章全文原样进入。写作不再附世界观设定附件原文。 */
export function buildWritingPrompt(body: NovelWritingRequest): string {
  const lines = [
    formatSectionsPrompt('世界观章节', body.worldview),
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    formatPlanPrompt(body.plan),
    formatCastPrompt(body.cast),
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
