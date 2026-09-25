import type { StructureBeat } from './types';

type MockChapterBeatsArgs = {
  chapterId: string;
  title: string;
  purpose: string;
};

/** 按章名与目的返回静态章内节拍（约 4 条）。 */
export function getMockChapterBeats({
  chapterId,
  title,
  purpose,
}: MockChapterBeatsArgs): StructureBeat[] {
  return [
    {
      id: `${chapterId}-beat-1`,
      text: `围绕「${title}」起势：${purpose.slice(0, 24)}${purpose.length > 24 ? '…' : ''}`,
    },
    {
      id: `${chapterId}-beat-2`,
      text: `推进冲突：与「${title}」相关的阻碍显现，人物被迫做出反应。`,
    },
    {
      id: `${chapterId}-beat-3`,
      text: `信息或关系发生变化，改变主人公对「${title}」的判断。`,
    },
    {
      id: `${chapterId}-beat-4`,
      text: `收束本章：留下通向下一章的钩子，呼应本章目的。`,
    },
  ];
}
