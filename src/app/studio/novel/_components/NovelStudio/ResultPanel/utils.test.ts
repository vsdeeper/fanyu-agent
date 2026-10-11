import { describe, expect, it } from 'vitest';
import { buildBibleMarkdown, buildStructureMarkdown } from './utils';

describe('buildBibleMarkdown', () => {
  it('导出人物、姓名化关系、世界设定与叙述选项', () => {
    const markdown = buildBibleMarkdown({
      characters: [
        {
          id: 'c1',
          name: '拾',
          role: 'protagonist',
          gender: 'male',
          identity: '无籍者',
          desire: '查明真相',
          flaw: '过于执着',
        },
        {
          id: 'c2',
          name: '霜',
          role: 'antagonist',
          gender: 'female',
          identity: '天象使',
          desire: '守住旧秩序',
          flaw: '',
        },
      ],
      relations: [{ fromId: 'c1', toId: 'c2', label: '互相试探' }],
      timePlace: '架空古代',
      rules: ['天象会改变人心'],
      taboos: ['不写无代价复活'],
      voiceFocus: {
        narrativeStance: ['voice-third', 'internal-focus'],
      },
      tense: 'past',
    });

    expect(markdown).toContain('# 小说设定');
    expect(markdown).toContain('### 拾');
    expect(markdown).toContain('- 定位：主角');
    expect(markdown).toContain('- 拾 → 霜：互相试探');
    expect(markdown).toContain('天象会改变人心');
    expect(markdown).toContain('人称=第三人称');
    expect(markdown).toContain('聚焦=内聚焦');
    expect(markdown).toContain('时态：过去时');
  });
});

describe('buildStructureMarkdown', () => {
  it('导出短篇梗概与节拍', () => {
    const markdown = buildStructureMarkdown({
      kind: 'short',
      synopsis: '一个无籍者追查天象真相。',
      beats: [
        { id: 'b1', text: '异象出现' },
        { id: 'b2', text: '主角踏上旅程' },
      ],
    });

    expect(markdown).toContain('# 故事结构');
    expect(markdown).toContain('## 一句话梗概');
    expect(markdown).toContain('1. 异象出现');
    expect(markdown).toContain('2. 主角踏上旅程');
  });

  it('导出长篇卷纲，并让章节序号跨卷连续', () => {
    const markdown = buildStructureMarkdown({
      kind: 'volumes',
      volumes: [
        {
          id: 'v1',
          title: '入局',
          purpose: '建立冲突',
          chapters: [
            {
              id: 'c1',
              title: '第1章 开端',
              purpose: '引出异象',
              beats: [{ id: 'b1', text: '目睹天裂' }],
            },
          ],
        },
        {
          id: 'v2',
          title: '破局',
          purpose: '揭开真相',
          chapters: [
            {
              id: 'c2',
              title: '真相',
              purpose: '完成选择',
              beats: [],
            },
          ],
        },
      ],
    });

    expect(markdown).toContain('## 第一卷　入局');
    expect(markdown).toContain('### 第一章　开端');
    expect(markdown).toContain('#### 章内节拍');
    expect(markdown).toContain('## 第二卷　破局');
    expect(markdown).toContain('### 第二章　真相');
  });
});
