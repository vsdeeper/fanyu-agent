import 'server-only';

import type {
  NovelBible,
  NovelBibleRequest,
  NovelChapterBeatsRequest,
  NovelCharacterGender,
  NovelCharacterRole,
  NovelLongFormat,
  NovelResearchRequest,
  NovelStructureRequest,
  NovelTense,
  NovelVolume,
  NovelPolishRequest,
  NovelVolumeChaptersRequest,
  NovelWritingRequest,
} from '../_shared/types';

const VOLUME_LABEL: Record<NovelVolume, string> = {
  short: '短篇',
  medium: '中篇',
  long: '长篇',
};

const LONG_FORMAT_LABEL: Record<NovelLongFormat, string> = {
  publish: '出版（单部约数十万字）',
  web: '网文（约百万字向）',
};

const ROLE_LABEL: Record<NovelCharacterRole, string> = {
  protagonist: '主角',
  antagonist: '对手',
  supporting: '配角',
};

const GENDER_LABEL: Record<NovelCharacterGender, string> = {
  female: '女',
  male: '男',
  unspecified: '不标明',
};

const TENSE_LABEL: Record<NovelTense, string> = {
  past: '过去时',
  present: '现在时',
};

/** 核心班底人数与规矩条数，按体量写进设定提示。 */
function bibleScaleHint(volume: NovelVolume, longFormat: NovelLongFormat | undefined): string {
  if (volume === 'short') return '核心人物 2～4 人，规矩 1～3 条';
  if (volume === 'medium') return '核心人物 4～8 人，规矩 2～4 条';
  if (resolveLongFormat('long', longFormat) === 'web') {
    return '核心人物 12～20 人，规矩 3～6 条';
  }
  return '核心人物 8～15 人，规矩 3～6 条';
}

/** 把设定压成后续步骤共用的短文本。 */
export function formatBiblePrompt(bible: NovelBible): string {
  const names = new Map(bible.characters.map((character) => [character.id, character.name]));
  const characters = bible.characters
    .map(
      (character) =>
        `- ${character.name}｜${ROLE_LABEL[character.role]}｜${character.gender ? GENDER_LABEL[character.gender] : '不标明'}｜${character.identity}｜想要：${character.desire}｜缺陷：${character.flaw}`,
    )
    .join('\n');
  const relations =
    bible.relations.length > 0
      ? bible.relations
          .map((relation) => {
            const from = names.get(relation.fromId) ?? relation.fromId;
            const to = names.get(relation.toId) ?? relation.toId;
            return `- ${from} — ${relation.label} — ${to}`;
          })
          .join('\n')
      : '无';
  const rules = bible.rules.length > 0 ? bible.rules.map((rule) => `- ${rule}`).join('\n') : '无';
  const taboos =
    bible.taboos && bible.taboos.length > 0
      ? bible.taboos.map((taboo) => `- ${taboo}`).join('\n')
      : '无';
  return [
    '【设定】',
    bible.voicePrompt.trim(),
    `时态：${TENSE_LABEL[bible.tense]}`,
    `时空：${bible.timePlace}`,
    '规矩：',
    rules,
    '禁忌：',
    taboos,
    '人物：',
    characters,
    '关系：',
    relations,
  ].join('\n');
}

/** 解析长篇赛道；非长篇或未传时按出版（短中篇算法不受影响）。 */
function resolveLongFormat(
  volume: NovelVolume | undefined,
  longFormat: NovelLongFormat | undefined,
): NovelLongFormat {
  if (volume && volume !== 'long') return 'publish';
  return longFormat === 'web' ? 'web' : 'publish';
}

/** 拼装选题调研用户提示。 */
export function buildResearchPrompt(body: NovelResearchRequest): string {
  const genres =
    body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定（可自由发挥）';
  const lines = [
    `我的想法：${body.idea}`,
    `偏好类型：${genres}`,
    `体量倾向：${VOLUME_LABEL[body.volume]}`,
  ];
  if (body.volume === 'long') {
    lines.push(`长篇赛道：${LONG_FORMAT_LABEL[resolveLongFormat('long', body.longFormat)]}`);
  }
  lines.push('请产出 3～5 张选题卡，末尾附 topics JSON。');
  return lines.join('\n');
}

/** 拼装设定用户提示。 */
export function buildBiblePrompt(body: NovelBibleRequest): string {
  const genres = body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定';
  const risk = body.topic.risk ? `\n风险/难点：${body.topic.risk}` : '';
  const longFormat = resolveLongFormat(body.volume, body.longFormat);
  const lines = [
    `我的想法：${body.idea}`,
    `偏好类型：${genres}`,
    `体量：${VOLUME_LABEL[body.volume]}`,
  ];
  if (body.volume === 'long') {
    lines.push(`长篇赛道：${LONG_FORMAT_LABEL[longFormat]}`);
  }
  lines.push(
    `选定选题：${body.topic.title}`,
    `类型与体量：${body.topic.genreVolume}`,
    `为什么值得写：${body.topic.why}`,
    `故事核：${body.topic.core}${risk}`,
    `规模：${bibleScaleHint(body.volume, body.longFormat)}`,
    '请产出核心班底、关系、时空、规矩与禁忌，末尾附 JSON。不要写人称、聚焦或时态。',
  );
  return lines.join('\n');
}

/** 拼装故事结构用户提示。 */
export function buildStructurePrompt(body: NovelStructureRequest): string {
  const genres = body.genres && body.genres.length > 0 ? body.genres.join('、') : '未指定';
  const risk = body.topic.risk ? `\n风险/难点：${body.topic.risk}` : '';
  const longFormat = resolveLongFormat(body.volume, body.longFormat);
  const shapeHint =
    body.volume === 'short'
      ? '请输出 short 结构（synopsis + beats），末尾附 JSON。'
      : body.volume === 'long'
        ? longFormat === 'web'
          ? '请输出 volumes 结构（约 8～12 卷，volumes[].chapters 必须为空数组），末尾附 JSON。'
          : '请输出 volumes 结构（约 3～5 卷，volumes[].chapters 必须为空数组），末尾附 JSON。'
        : '请输出 chapters 结构（chapters[].beats 必须为空数组），末尾附 JSON。';
  const lines = [
    `我的想法：${body.idea}`,
    `偏好类型：${genres}`,
    `体量：${VOLUME_LABEL[body.volume]}`,
  ];
  if (body.volume === 'long') {
    lines.push(`长篇赛道：${LONG_FORMAT_LABEL[longFormat]}`);
  }
  lines.push(
    `选定选题：${body.topic.title}`,
    `类型与体量：${body.topic.genreVolume}`,
    `为什么值得写：${body.topic.why}`,
    `故事核：${body.topic.core}${risk}`,
    formatBiblePrompt(body.bible),
    shapeHint,
  );
  return lines.join('\n');
}

/** 拼装按卷章纲用户提示。 */
export function buildVolumeChaptersPrompt(body: NovelVolumeChaptersRequest): string {
  const longFormat = resolveLongFormat('long', body.longFormat);
  const chapterHint = longFormat === 'web' ? '本卷约 15～25 章' : '本卷约 4～8 章';
  const siblings =
    body.siblingVolumes && body.siblingVolumes.length > 0
      ? [
          '同书其它卷：',
          ...body.siblingVolumes.map((vol) => `- [${vol.id}] ${vol.title}：${vol.purpose}`),
        ].join('\n')
      : '同书其它卷：无';
  const existing =
    typeof body.existingChapterCount === 'number'
      ? `全书已有章数（不含本卷）：${body.existingChapterCount}`
      : '全书已有章数（不含本卷）：0';
  return [
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    formatBiblePrompt(body.bible),
    `长篇赛道：${LONG_FORMAT_LABEL[longFormat]}`,
    `本卷 id：${body.volume.id}`,
    `本卷标题：${body.volume.title}`,
    `本卷目的：${body.volume.purpose}`,
    existing,
    siblings,
    `请为本卷生成章纲列表（${chapterHint}；beats 皆为空数组），末尾附 chapters JSON。`,
  ].join('\n');
}

/** 拼装章内节拍用户提示。 */
export function buildChapterBeatsPrompt(body: NovelChapterBeatsRequest): string {
  const longFormat = resolveLongFormat('long', body.longFormat);
  const beatHint =
    body.longFormat === 'web'
      ? '通常 3～5 条节拍；章目标篇幅约 2000～5000 字'
      : '通常 3～6 条节拍；章目标篇幅约 2000～12000 字';
  const siblings =
    body.siblingChapters && body.siblingChapters.length > 0
      ? [
          '同书其它章纲：',
          ...body.siblingChapters.map((ch) => `- [${ch.id}] ${ch.title}：${ch.purpose}`),
        ].join('\n')
      : '同书其它章纲：无';
  const lines = [
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    formatBiblePrompt(body.bible),
  ];
  if (body.longFormat) {
    lines.push(`长篇赛道：${LONG_FORMAT_LABEL[longFormat]}`);
  }
  lines.push(
    `本章 id：${body.chapter.id}`,
    `本章标题：${body.chapter.title}`,
    `本章目的：${body.chapter.purpose}`,
    siblings,
    `请为本章节生成节拍列表（${beatHint}），末尾附 beats JSON。`,
  );
  return lines.join('\n');
}

/** 拼装正文写作用户提示。 */
export function buildWritingPrompt(body: NovelWritingRequest): string {
  const longFormat = resolveLongFormat(body.volume, body.longFormat);
  const lengthHint =
    body.volume === 'short'
      ? '本节拍约 600～1200 字'
      : body.volume === 'long' && longFormat === 'web'
        ? '本节拍约 600～1500 字'
        : '本节拍约 700～2000 字';
  const chapterLines =
    body.chapterTitle || body.chapterPurpose
      ? [
          body.chapterTitle ? `所属章节：${body.chapterTitle}` : '',
          body.chapterPurpose ? `本章目的：${body.chapterPurpose}` : '',
        ].filter(Boolean)
      : ['所属：短篇节拍（无章节）'];
  const lines = [
    `选题：${body.topic.title}（${body.topic.genreVolume}）`,
    `故事核：${body.topic.core}`,
    formatBiblePrompt(body.bible),
    `体量：${VOLUME_LABEL[body.volume]}`,
  ];
  if (body.volume === 'long') {
    lines.push(`长篇赛道：${LONG_FORMAT_LABEL[longFormat]}`);
  }
  if (body.stylePrompt?.trim()) {
    lines.push('【文风】', body.stylePrompt.trim());
  }
  lines.push(
    ...chapterLines,
    `节拍 unitId：${body.unitId}`,
    `节拍内容：${body.beatText}`,
    `请只写本节拍正文（${lengthHint}）。`,
  );
  return lines.join('\n');
}

/** 拼装单节拍通顺润色用户提示。 */
export function buildPolishPrompt(body: NovelPolishRequest): string {
  const beat = body.beatText?.trim();
  const style = body.stylePrompt?.trim();
  return [
    ...(beat ? ['【节拍】', beat] : []),
    ...(style ? ['【文风】', style] : []),
    '【原文】',
    body.body.trim(),
    '',
    '请输出润色后的完整正文（改通顺、不当搭配、主谓错位、指称偷换与半吊子术语，不改情节、对话内容与人称；空行分段；不要标题、说明或代码块）。',
  ].join('\n');
}
