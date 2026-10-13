import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isNovelIdeaFile } from '../_shared/idea-file';
import { resolveNovelIdeaFiles } from './idea-file';
import { parseCastBody, parseResearchBody } from './parse-request';
import { buildCastPrompt, buildResearchPrompt } from './prompt';

const TXT = {
  filename: '大纲.txt',
  mediaType: 'text/plain',
  dataUrl: `data:text/plain;base64,${Buffer.from('夏天停电').toString('base64')}`,
};

const topic = {
  id: 'yard',
  title: '停电的院子',
  genreVolume: '现实 · 短篇',
  why: '有一个具体的晚上',
  core: '全家在院子里说话',
};

describe('isNovelIdeaFile', () => {
  it('接受 txt、md、pdf，拒绝其它扩展名', () => {
    expect(isNovelIdeaFile('a.txt', '')).toBe(true);
    expect(isNovelIdeaFile('a.md', 'application/octet-stream')).toBe(true);
    expect(isNovelIdeaFile('a.pdf', 'application/pdf')).toBe(true);
    expect(isNovelIdeaFile('a.docx', 'application/octet-stream')).toBe(false);
  });
});

describe('parseResearchBody', () => {
  it('体系设定必填，想法可选', () => {
    expect(parseResearchBody({ idea: ' 院子 ', ideaFiles: [TXT] })).toMatchObject({
      idea: '院子',
      ideaFiles: [TXT],
    });
    expect(parseResearchBody({ ideaFiles: [TXT] })).toMatchObject({ ideaFiles: [TXT] });
    expect(parseResearchBody({ idea: '院子' })).toBeNull();
  });

  it('两项都空时拒绝', () => {
    expect(parseResearchBody({})).toBeNull();
    expect(parseResearchBody({ idea: '   ' })).toBeNull();
    expect(
      parseResearchBody({
        ideaFiles: [
          {
            filename: 'a.docx',
            mediaType: 'application/octet-stream',
            dataUrl: TXT.dataUrl,
          },
        ],
      }),
    ).toBeNull();
  });
});

describe('resolveNovelIdeaFiles', () => {
  it('抽出 txt 正文', async () => {
    const resolved = await resolveNovelIdeaFiles([TXT]);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.documentsText).toContain('夏天停电');
    expect(resolved.pdfParts).toEqual([]);
  });

  it('多份文本拼在一起，空 PDF 视为无法读取', async () => {
    const second = {
      filename: '设定.md',
      mediaType: 'text/markdown',
      dataUrl: `data:text/markdown;base64,${Buffer.from('山海').toString('base64')}`,
    };
    const resolved = await resolveNovelIdeaFiles([TXT, second]);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.documentsText).toContain('夏天停电');
    expect(resolved.documentsText).toContain('山海');

    const emptyPdf = await resolveNovelIdeaFiles([
      {
        filename: '空.pdf',
        mediaType: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,',
      },
    ]);
    expect(emptyPdf.ok).toBe(false);
  });

  it('超过三份时拒绝', () => {
    expect(
      parseResearchBody({
        ideaFiles: [TXT, TXT, TXT, TXT],
      }),
    ).toBeNull();
  });
});

describe('buildResearchPrompt', () => {
  it('未附文件正文时不写体系设定块', () => {
    const prompt = buildResearchPrompt({ idea: '院子', ideaFiles: [TXT] });
    expect(prompt).toContain('我的想法：院子');
    expect(prompt).not.toContain('【体系设定】');
  });

  it('只填文件时说明以体系设定为准', () => {
    const prompt = buildResearchPrompt(
      { ideaFiles: [TXT] },
      { documentsText: '附件「大纲.txt」：\n夏天停电' },
    );
    expect(prompt).toContain('未填写，以体系设定为准');
    expect(prompt).toContain('夏天停电');
  });
});

describe('buildCastPrompt', () => {
  const plan = {
    worldview: { orders: [], hiddenTruth: '', assets: [] },
    threads: [{ id: 't1', name: '院子', core: '停电夜里把话说完' }],
    ending: '',
    theme: '',
    volumes: [
      {
        id: 'v1',
        title: '院子',
        geography: '夏天',
        conflict: '家里人不说',
        relations: '',
        assets: [],
        hook: '',
        targetChars: 20000,
      },
    ],
  };

  it('PDF 体系设定写成附件说明', () => {
    const prompt = buildCastPrompt(
      { topic, plan, idea: '院子', ideaFiles: [TXT] },
      { pdfCount: 2 },
    );
    expect(prompt).toContain('2 份 PDF');
    expect(parseCastBody({ topic, ideaFiles: [TXT], plan })?.ideaFiles?.[0]?.filename).toBe(
      '大纲.txt',
    );
  });
});
