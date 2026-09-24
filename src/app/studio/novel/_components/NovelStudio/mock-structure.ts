import type { NovelVolume, StructureSnapshot } from './types';

const MOCK_SHORT: StructureSnapshot = {
  kind: 'short',
  synopsis: '停电之夜，一家人被迫坐在一起，终于把平时说不出口的话说了出来。',
  beats: [
    { id: 'beat-1', text: '傍晚突然停电，屋里闷热，孩子们先抱怨起来。' },
    { id: 'beat-2', text: '全家搬到院子乘凉，邻居的说话声隐约传来。' },
    { id: 'beat-3', text: '父亲提起一件旧事，空气忽然安静。' },
    { id: 'beat-4', text: '母亲试图打圆场，却把更尖锐的矛盾带了出来。' },
    { id: 'beat-5', text: '有人起身要回屋，又在门槛处停住。' },
    { id: 'beat-6', text: '来电的瞬间，刚才的话像没发生过，又像再也收不回去。' },
  ],
};

const MOCK_CHAPTERS_MEDIUM: StructureSnapshot = {
  kind: 'chapters',
  chapters: [
    {
      id: 'ch-1',
      title: '第一章　钥匙',
      purpose: '整理旧屋时发现对不上任何锁的钥匙，引出主人公的犹豫。',
    },
    {
      id: 'ch-2',
      title: '第二章　旧址',
      purpose: '按模糊记忆找到可能相关的地方，第一次碰壁。',
    },
    {
      id: 'ch-3',
      title: '第三章　证人',
      purpose: '见到知情者，得知钥匙曾开过的门与一段未了结的关系。',
    },
    {
      id: 'ch-4',
      title: '第四章　门',
      purpose: '真正面对那扇门与选择：打开，或把钥匙重新收起。',
    },
  ],
};

const MOCK_CHAPTERS_LONG: StructureSnapshot = {
  kind: 'chapters',
  chapters: [
    ...MOCK_CHAPTERS_MEDIUM.chapters,
    {
      id: 'ch-5',
      title: '第五章　余响',
      purpose: '开门之后的代价显现，主人公必须对当下生活做出回应。',
    },
    {
      id: 'ch-6',
      title: '第六章　归还',
      purpose: '钥匙回到它该在的位置，或永远成为随身之物；收束主题。',
    },
  ],
};

/** 按体量返回静态故事结构；短篇节拍，中/长篇章纲。 */
export function getMockStructure(volume: NovelVolume): StructureSnapshot {
  if (volume === 'short') return structuredClone(MOCK_SHORT);
  if (volume === 'long') return structuredClone(MOCK_CHAPTERS_LONG);
  return structuredClone(MOCK_CHAPTERS_MEDIUM);
}
