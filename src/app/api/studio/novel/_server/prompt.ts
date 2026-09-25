import 'server-only';

import type {
  NovelChapterBeatsRequest,
  NovelLongFormat,
  NovelResearchRequest,
  NovelStructureRequest,
  NovelVolume,
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
    `体量：${VOLUME_LABEL[body.volume]}`,
  ];
  if (body.volume === 'long') {
    lines.push(`长篇赛道：${LONG_FORMAT_LABEL[longFormat]}`);
  }
  if (body.stylePrompt?.trim()) {
    lines.push('文风：', body.stylePrompt.trim());
  }
  lines.push(
    ...chapterLines,
    `节拍 unitId：${body.unitId}`,
    `节拍内容：${body.beatText}`,
    `请只写本节拍正文（${lengthHint}）。`,
  );
  return lines.join('\n');
}
