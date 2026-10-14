import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { isNovelIdeaFile } from '../_shared/idea-file';
import { resolveNovelIdeaFiles } from './idea-file';
import {
  parseCastBody,
  parsePlanBody,
  parseResearchBody,
  parseWorldviewBody,
} from './parse-request';
import { buildCastPrompt, buildPlanPrompt, buildResearchPrompt } from './prompt';

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

const worldview = [{ id: 'w1', title: '县城', blocks: [{ title: '地图', body: '夏天，老院子' }] }];

describe('isNovelIdeaFile', () => {
  it('接受 txt、md、pdf，拒绝其它扩展名', () => {
    expect(isNovelIdeaFile('a.txt', '')).toBe(true);
    expect(isNovelIdeaFile('a.md', 'application/octet-stream')).toBe(true);
    expect(isNovelIdeaFile('a.pdf', 'application/pdf')).toBe(true);
    expect(isNovelIdeaFile('a.docx', 'application/octet-stream')).toBe(false);
  });
});

describe('parseWorldviewBody', () => {
  it('世界观附件必填，最多三份', () => {
    expect(parseWorldviewBody({ ideaFiles: [TXT] })).toMatchObject({ ideaFiles: [TXT] });
    expect(parseWorldviewBody({})).toBeNull();
    expect(parseWorldviewBody({ ideaFiles: [TXT, TXT, TXT, TXT] })).toBeNull();
    expect(
      parseWorldviewBody({
        ideaFiles: [
          { filename: 'a.docx', mediaType: 'application/octet-stream', dataUrl: TXT.dataUrl },
        ],
      }),
    ).toBeNull();
  });
});

describe('parseResearchBody', () => {
  it('世界观章节必填，创作方案文件可选', () => {
    expect(parseResearchBody({ worldview })).toMatchObject({ worldview });
    expect(parseResearchBody({ worldview, planFile: TXT })).toMatchObject({ planFile: TXT });
    expect(parseResearchBody({})).toMatchObject({ worldview: [] });
  });
});

describe('parsePlanBody', () => {
  it('必须带选定选题', () => {
    expect(parsePlanBody({ worldview, topic })).toMatchObject({ topic });
    expect(parsePlanBody({ worldview })).toBeNull();
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
});

describe('buildResearchPrompt', () => {
  it('带上世界观章节，不写旧的想法一项', () => {
    const prompt = buildResearchPrompt({ worldview, genres: ['现实'] });
    expect(prompt).toContain('【世界观章节】');
    expect(prompt).toContain('夏天，老院子');
    expect(prompt).toContain('偏好类型：现实');
    expect(prompt).not.toContain('我的想法');
  });

  it('附了创作方案样本时写进提示', () => {
    const prompt = buildResearchPrompt(
      { worldview },
      { documentsText: '附件「大纲.txt」：\n夏天停电' },
    );
    expect(prompt).toContain('【创作方案文件】');
    expect(prompt).toContain('夏天停电');
  });
});

describe('buildPlanPrompt', () => {
  it('带上世界观章节、选题与样本，要求两级章节', () => {
    const prompt = buildPlanPrompt(
      { worldview, topic },
      { documentsText: '样本正文', pdfCount: 1 },
    );
    expect(prompt).toContain('【世界观章节】');
    expect(prompt).toContain('选定选题：停电的院子');
    expect(prompt).toContain('样本正文');
    expect(prompt).toContain('1 份 PDF');
    expect(prompt).toContain('sections JSON');
  });
});

describe('buildCastPrompt', () => {
  it('带上世界观章节、方案与选题，并接受角色请求', () => {
    const plan = {
      sections: [{ id: 's1', title: '县城', blocks: [{ title: '核心冲突', body: '不说' }] }],
    };
    const prompt = buildCastPrompt({ worldview, topic, plan });
    expect(prompt).toContain('【世界观章节】');
    expect(prompt).toContain('【创作方案】');
    expect(prompt).toContain('不说');
    expect(parseCastBody({ worldview, topic, plan })?.topic.title).toBe('停电的院子');
  });
});
