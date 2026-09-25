type MockWritingBodyArgs =
  | {
      kind: 'beat';
      beatText: string;
      chapterTitle?: string;
      chapterPurpose?: string;
    }
  | {
      kind: 'chapter';
      chapterTitle: string;
      chapterPurpose: string;
      beatTexts?: string[];
    };

/** 按节拍或整章上下文返回静态假正文。 */
export function getMockWritingBody(args: MockWritingBodyArgs): string {
  if (args.kind === 'beat') {
    const chapterHint = args.chapterTitle
      ? `（章：${args.chapterTitle}${args.chapterPurpose ? `／${args.chapterPurpose}` : ''}）`
      : '';
    return [
      `${args.beatText}${chapterHint}`,
      '他停了一下，像是在确认刚才发生的事是否真的发生过。',
      '空气里有一点迟疑，又有一点不得不继续往前的劲头。',
      '这一拍结束时，情绪已经比开头更清楚，却还没有结论。',
    ].join('\n\n');
  }

  const beatBlock =
    args.beatTexts && args.beatTexts.length > 0
      ? `\n\n本章节拍：\n${args.beatTexts.map((text, index) => `${index + 1}. ${text}`).join('\n')}`
      : '';

  return [
    `【${args.chapterTitle}】`,
    args.chapterPurpose,
    '场景慢慢展开。人物带着尚未说清的心事走进这一章，每一步都像在试探边界。',
    '冲突被推近一点，又被轻轻按住；读者能感到有什么正在成形，却还不能开口命名。',
    '章末留下一个未解的动作或眼神，把分量交给下一章。',
    beatBlock,
  ]
    .filter(Boolean)
    .join('\n\n');
}
