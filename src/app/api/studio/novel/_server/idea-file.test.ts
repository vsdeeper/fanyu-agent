import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isNovelIdeaFile } from '../_shared/idea-file';
import { resolveNovelIdeaFiles } from './idea-file';
import { parseBibleBody, parseResearchBody } from './parse-request';
import { buildBiblePrompt, buildResearchPrompt } from './prompt';

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
  it('想法与思路文件填一项即可', () => {
    expect(parseResearchBody({ idea: ' 院子 ', volume: 'short' })).toMatchObject({
      idea: '院子',
      volume: 'short',
    });
    expect(parseResearchBody({ ideaFiles: [TXT], volume: 'medium' })).toMatchObject({
      ideaFiles: [TXT],
      volume: 'medium',
    });
  });

  it('两项都空时拒绝', () => {
    expect(parseResearchBody({ volume: 'short' })).toBeNull();
    expect(parseResearchBody({ idea: '   ', volume: 'short' })).toBeNull();
    expect(
      parseResearchBody({
        ideaFiles: [
          {
            filename: 'a.docx',
            mediaType: 'application/octet-stream',
            dataUrl: TXT.dataUrl,
          },
        ],
        volume: 'short',
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
        volume: 'short',
      }),
    ).toBeNull();
  });
});

describe('buildResearchPrompt', () => {
  it('只填想法时不提思路文件', () => {
    const prompt = buildResearchPrompt({ idea: '院子', volume: 'short' });
    expect(prompt).toContain('我的想法：院子');
    expect(prompt).not.toContain('思路文件');
  });

  it('只填文件时说明以文件为准', () => {
    const prompt = buildResearchPrompt(
      { volume: 'short' },
      { documentsText: '附件「大纲.txt」：\n夏天停电' },
    );
    expect(prompt).toContain('未填写，以思路文件为准');
    expect(prompt).toContain('夏天停电');
  });
});

describe('buildBiblePrompt', () => {
  it('PDF 思路文件写成附件说明', () => {
    const prompt = buildBiblePrompt({ volume: 'short', topic }, { pdfCount: 2 });
    expect(prompt).toContain('2 份 PDF');
    expect(
      parseBibleBody({ volume: 'short', topic, ideaFiles: [TXT] })?.ideaFiles?.[0]?.filename,
    ).toBe('大纲.txt');
  });
});
