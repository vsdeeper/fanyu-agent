import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isNovelIdeaFile } from '../_shared/idea-file';
import { resolveNovelIdeaFile } from './idea-file';
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
    expect(parseResearchBody({ ideaFile: TXT, volume: 'medium' })).toMatchObject({
      ideaFile: TXT,
      volume: 'medium',
    });
  });

  it('两项都空时拒绝', () => {
    expect(parseResearchBody({ volume: 'short' })).toBeNull();
    expect(parseResearchBody({ idea: '   ', volume: 'short' })).toBeNull();
    expect(
      parseResearchBody({
        ideaFile: {
          filename: 'a.docx',
          mediaType: 'application/octet-stream',
          dataUrl: TXT.dataUrl,
        },
        volume: 'short',
      }),
    ).toBeNull();
  });
});

describe('resolveNovelIdeaFile', () => {
  it('抽出 txt 正文', async () => {
    const resolved = await resolveNovelIdeaFile(TXT);
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    expect(resolved.documentsText).toContain('夏天停电');
    expect(resolved.pdfPart).toBeUndefined();
  });

  it('空 PDF 视为无法读取', async () => {
    const resolved = await resolveNovelIdeaFile({
      filename: '空.pdf',
      mediaType: 'application/pdf',
      dataUrl: 'data:application/pdf;base64,',
    });
    expect(resolved.ok).toBe(false);
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
    const prompt = buildBiblePrompt(
      {
        volume: 'short',
        topic,
        ideaFile: { ...TXT, filename: '大纲.pdf', mediaType: 'application/pdf' },
      },
      { hasPdf: true },
    );
    expect(prompt).toContain('1 份 PDF');
    expect(parseBibleBody({ volume: 'short', topic, ideaFile: TXT })?.ideaFile?.filename).toBe(
      '大纲.txt',
    );
  });
});
