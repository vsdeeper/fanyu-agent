import { describe, expect, it } from 'vitest';
import type { BibleStepSnapshot, StructureSnapshot } from '../types';
import {
  buildBibleMarkdown,
  buildStructureMarkdown,
  parseBibleMarkdownImport,
  parseStructureMarkdownImport,
} from './utils';

const BIBLE: BibleStepSnapshot = {
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
};

/** 改写导出信封，用于覆盖错误版本与损坏数据。 */
function rewriteEnvelope(
  markdown: string,
  mutate: (envelope: Record<string, unknown>) => void,
): string {
  const pattern = /(<!--\s*fanyu-novel-export\s+)([A-Za-z0-9+/=\r\n]+?)(\s*-->)/;
  const match = markdown.match(pattern);
  if (!match?.[2]) throw new Error('missing test payload');
  const decoded = new TextDecoder().decode(
    Uint8Array.from(atob(match[2].replace(/\s/g, '')), (character) => character.charCodeAt(0)),
  );
  const envelope = JSON.parse(decoded) as Record<string, unknown>;
  mutate(envelope);
  const bytes = new TextEncoder().encode(JSON.stringify(envelope));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return markdown.replace(pattern, `$1${btoa(binary)}$3`);
}

describe('buildBibleMarkdown', () => {
  it('导出人物、姓名化关系、世界设定与叙述选项', () => {
    const markdown = buildBibleMarkdown(BIBLE);

    expect(markdown).toContain('# 小说设定');
    expect(markdown).toContain('### 拾');
    expect(markdown).toContain('- 定位：主角');
    expect(markdown).toContain('- 拾 → 霜：互相试探');
    expect(markdown).toContain('天象会改变人心');
    expect(markdown).toContain('人称=第三人称');
    expect(markdown).toContain('聚焦=内聚焦');
    expect(markdown).toContain('时态：过去时');
  });

  it('中文设定可从结构载荷完整往返，且不带生成过程文本', () => {
    const result = parseBibleMarkdownImport(
      buildBibleMarkdown({ ...BIBLE, streamText: '内部生成过程' }),
    );

    expect(result).toEqual({ ok: true, data: BIBLE });
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

  it.each<StructureSnapshot>([
    {
      kind: 'short',
      synopsis: '一个无籍者追查天象真相。',
      beats: [{ id: 'b1', text: '异象出现' }],
    },
    {
      kind: 'chapters',
      chapters: [
        {
          id: 'c1',
          title: '开端',
          purpose: '引出异象',
          beats: [{ id: 'b1', text: '目睹天裂' }],
        },
      ],
    },
    {
      kind: 'volumes',
      volumes: [
        {
          id: 'v1',
          title: '入局',
          purpose: '建立冲突',
          chapters: [
            {
              id: 'c1',
              title: '开端',
              purpose: '引出异象',
              beats: [{ id: 'b1', text: '目睹天裂' }],
            },
          ],
        },
      ],
    },
  ])('三种故事结构均可从导出载荷往返', (structure) => {
    expect(parseStructureMarkdownImport(buildStructureMarkdown(structure))).toEqual({
      ok: true,
      data: structure,
    });
  });
});

describe('Markdown 导入载荷校验', () => {
  it('拒绝缺少载荷和步骤类型不匹配的文件', () => {
    expect(parseBibleMarkdownImport('# 普通 Markdown')).toEqual({
      ok: false,
      error: 'missing-payload',
    });
    expect(parseStructureMarkdownImport(buildBibleMarkdown(BIBLE))).toEqual({
      ok: false,
      error: 'wrong-type',
    });
  });

  it('拒绝不支持的版本、损坏信封和无效业务数据', () => {
    const markdown = buildBibleMarkdown(BIBLE);
    expect(
      parseBibleMarkdownImport(
        rewriteEnvelope(markdown, (envelope) => {
          envelope.version = 999;
        }),
      ),
    ).toEqual({ ok: false, error: 'unsupported-version' });
    expect(markdown.replace(/[A-Za-z0-9+/=]+(?=\s*-->)/, 'AAAA')).not.toBe(markdown);
    expect(parseBibleMarkdownImport(markdown.replace(/[A-Za-z0-9+/=]+(?=\s*-->)/, 'AAAA'))).toEqual(
      { ok: false, error: 'invalid-payload' },
    );
    expect(
      parseBibleMarkdownImport(
        rewriteEnvelope(markdown, (envelope) => {
          envelope.data = { characters: [] };
        }),
      ),
    ).toEqual({ ok: false, error: 'invalid-payload' });
  });
});
