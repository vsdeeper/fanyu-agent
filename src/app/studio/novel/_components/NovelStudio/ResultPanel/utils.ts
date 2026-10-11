import { formatStyleSelections } from '@/app/studio/_components/StyleDimensionPicker';
import {
  BIBLE_HIDDEN_AXIS_LABELS,
  CHARACTER_GENDER_OPTIONS,
  CHARACTER_ROLE_OPTIONS,
  TENSE_OPTIONS,
} from '../constants';
import type {
  BibleStepSnapshot,
  StructureChapter,
  StructureSnapshot,
  StructureVolume,
} from '../types';
import { formatChapterPrefix, stripChapterPrefix, toChineseNumeral } from './ChapterList/utils';

/** 把当前设定整理成人可读的 Markdown，关系中的人物 id 转为姓名。 */
export function buildBibleMarkdown(bible: BibleStepSnapshot): string {
  const characterNames = new Map(
    bible.characters.map((character) => [character.id, character.name.trim()]),
  );
  const lines = ['# 小说设定', '', '## 人物'];

  for (const character of bible.characters) {
    const role =
      CHARACTER_ROLE_OPTIONS.find((option) => option.value === character.role)?.label ??
      character.role;
    const gender = CHARACTER_GENDER_OPTIONS.find(
      (option) => option.value === character.gender,
    )?.label;
    lines.push(
      '',
      `### ${character.name.trim()}`,
      '',
      `- 定位：${role}`,
      `- 性别：${gender ?? ''}`,
      `- 身份：${character.identity.trim()}`,
      `- 欲望：${character.desire.trim()}`,
    );
    if (character.flaw.trim()) lines.push(`- 缺陷：${character.flaw.trim()}`);
  }

  lines.push('', '## 关系', '');
  if (bible.relations.length) {
    lines.push(
      ...bible.relations.map((relation) => {
        const from = characterNames.get(relation.fromId) || relation.fromId;
        const to = characterNames.get(relation.toId) || relation.toId;
        return `- ${from} → ${to}：${relation.label.trim()}`;
      }),
    );
  }

  lines.push('', '## 时空', '', bible.timePlace.trim(), '', '## 规矩', '');
  lines.push(...bible.rules.map((rule) => `- ${rule.trim()}`));
  lines.push('', '## 禁忌', '');
  lines.push(...bible.taboos.map((taboo) => `- ${taboo.trim()}`));

  const narration = formatStyleSelections(bible.voiceFocus, {
    hiddenAxisLabels: BIBLE_HIDDEN_AXIS_LABELS,
  });
  const tense = TENSE_OPTIONS.find((option) => option.value === bible.tense)?.label;
  lines.push('', '## 叙述', '');
  if (narration) lines.push(narration);
  if (tense) lines.push(`时态：${tense}`);

  return `${lines.join('\n').trim()}\n`;
}

/** 将一章及其节拍追加到 Markdown；标题层级由调用方决定。 */
function appendChapter(
  lines: string[],
  chapter: StructureChapter,
  index: number,
  headingLevel: 2 | 3,
): void {
  const title = stripChapterPrefix(chapter.title);
  lines.push(
    `${'#'.repeat(headingLevel)} ${formatChapterPrefix(index)}${title ? `　${title}` : ''}`,
    '',
    `- 本章目的：${chapter.purpose.trim()}`,
  );
  if (!chapter.beats.length) return;
  lines.push('', `${'#'.repeat(headingLevel + 1)} 章内节拍`, '');
  lines.push(...chapter.beats.map((beat, beatIndex) => `${beatIndex + 1}. ${beat.text.trim()}`));
}

/** 将一卷及其章纲追加到 Markdown，章节序号沿用全书顺序。 */
function appendVolume(
  lines: string[],
  volume: StructureVolume,
  volumeIndex: number,
  chapterOffset: number,
): void {
  lines.push(
    `## 第${toChineseNumeral(volumeIndex)}卷　${volume.title.trim()}`,
    '',
    `- 本卷目的：${volume.purpose.trim()}`,
  );
  for (const [index, chapter] of volume.chapters.entries()) {
    lines.push('');
    appendChapter(lines, chapter, chapterOffset + index + 1, 3);
  }
}

/** 把短篇节拍、中篇章纲或长篇卷纲整理成人可读的 Markdown。 */
export function buildStructureMarkdown(structure: StructureSnapshot): string {
  const lines = ['# 故事结构', ''];
  if (structure.kind === 'short') {
    lines.push('## 一句话梗概', '', structure.synopsis.trim(), '', '## 节拍', '');
    lines.push(...structure.beats.map((beat, index) => `${index + 1}. ${beat.text.trim()}`));
  } else if (structure.kind === 'chapters') {
    for (const [index, chapter] of structure.chapters.entries()) {
      if (index) lines.push('');
      appendChapter(lines, chapter, index + 1, 2);
    }
  } else {
    let chapterOffset = 0;
    for (const [index, volume] of structure.volumes.entries()) {
      if (index) lines.push('');
      appendVolume(lines, volume, index + 1, chapterOffset);
      chapterOffset += volume.chapters.length;
    }
  }
  return `${lines.join('\n').trim()}\n`;
}

/** 在浏览器中下载文本文件。 */
function downloadText(content: string, fileName: string, mediaType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mediaType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 在浏览器中下载 Markdown 设定文件。 */
export function downloadBibleMarkdown(
  bible: BibleStepSnapshot,
  fileName: string,
  mediaType: string,
): void {
  downloadText(buildBibleMarkdown(bible), fileName, mediaType);
}

/** 在浏览器中下载 Markdown 故事结构文件。 */
export function downloadStructureMarkdown(
  structure: StructureSnapshot,
  fileName: string,
  mediaType: string,
): void {
  downloadText(buildStructureMarkdown(structure), fileName, mediaType);
}
