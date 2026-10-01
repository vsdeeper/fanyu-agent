import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { parsePlanBody } from './parse-request';
import { buildPlanPrompt } from './prompt';
import { resolveImageTextDocuments } from './resolve-documents';

const DOC = {
  filename: '大纲.md',
  mediaType: 'text/markdown',
  dataUrl: 'data:text/markdown;base64,IyDmoLnlvq4=',
};

const PDF = {
  filename: '资料.pdf',
  mediaType: 'application/pdf',
  // 最小合法 base64 占位；decode 后非空即可
  dataUrl: 'data:application/pdf;base64,JVBERi0=',
};

describe('parsePlanBody', () => {
  it('接受仅文本素材', () => {
    expect(parsePlanBody({ documents: [DOC] })).toEqual({
      materialDataUrls: [],
      documents: [DOC],
    });
  });

  it('接受 PDF 素材', () => {
    expect(parsePlanBody({ documents: [PDF] })).toEqual({
      materialDataUrls: [],
      documents: [PDF],
    });
  });

  it('拒绝 Word 等非允许类型', () => {
    expect(
      parsePlanBody({
        documents: [
          {
            filename: 'a.docx',
            mediaType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            dataUrl: 'data:application/octet-stream;base64,AA==',
          },
        ],
      }),
    ).toBeNull();
  });

  it('素材图、素材文件、内容皆空时拒绝', () => {
    expect(parsePlanBody({ materialDataUrls: [], documents: [], content: '  ' })).toBeNull();
  });
});

describe('buildPlanPrompt', () => {
  it('写入文本素材正文与 PDF 份数说明', () => {
    const prompt = buildPlanPrompt(
      { materialDataUrls: [], documents: [DOC, PDF], content: '补充要点' },
      { documentsText: '附件「大纲.md」：\n# 主题', pdfCount: 1 },
    );
    expect(prompt).toContain('【文本素材】');
    expect(prompt).toContain('# 主题');
    expect(prompt).toContain('【PDF 素材】共 1 份');
    expect(prompt).toContain('【内容】');
    expect(prompt).toContain('补充要点');
  });
});

describe('resolveImageTextDocuments', () => {
  it('PDF 转为 file part，TXT/MD 抽正文', async () => {
    const result = await resolveImageTextDocuments([DOC, PDF]);
    expect(result.invalidPdfs).toBe(false);
    expect(result.documentsText).toContain('大纲.md');
    expect(result.pdfParts).toHaveLength(1);
    expect(result.pdfParts[0]?.mediaType).toBe('application/pdf');
    expect(result.pdfParts[0]?.filename).toBe('资料.pdf');
  });
});
