import { tool } from 'ai';
import { z } from 'zod';

import { DESIGN_MD_MAX_CHARS, DEFAULT_DESIGN_MD_FILENAME } from '@/app/api/docs/_shared/constants';
import { saveDesignDoc } from '@/app/api/docs/_server/assets';
import { buildDocAssetUrl } from '@/app/api/docs/_shared/url';
import type { AgentToolDefinition } from '../types';

export type SaveDesignMdSuccess = {
  ok: true;
  assetId: string;
  url: string;
  fileName: string;
  byteSize: number;
};

export type SaveDesignMdFailure = {
  ok: false;
  error: string;
};

export type SaveDesignMdResult = SaveDesignMdSuccess | SaveDesignMdFailure;

function getSaveDesignMdHint(): string {
  return `DESIGN.md 落盘工具使用规则：
- 仅当用户明确要求输出设计系统文档 / DESIGN.md，或上一轮已邀请且用户确认时，调用 save_design_md
- 把完整 DESIGN.md Markdown 作为 content 传入；fileName 默认 DESIGN.md
- 界面会自动给出下载链接；汇总回复只用一两句说明文档已就绪
- 禁止在正文中粘贴文档全文、Markdown 代码块、或 /api/docs 链接
- 未确认要文档时不要调用`;
}

/** 创建 save_design_md：把 DESIGN.md 正文落盘，供气泡展示下载链接。 */
function createSaveDesignMdTool(chatId: string) {
  return tool({
    description:
      '将 DESIGN.md 设计系统文档落盘并生成下载链接。仅在用户确认要输出该文档时调用；不要把正文写进对用户的回复。',
    inputSchema: z.object({
      content: z
        .string()
        .min(1)
        .max(DESIGN_MD_MAX_CHARS)
        .describe('完整 DESIGN.md Markdown 正文，含全部章节'),
      fileName: z.string().optional().describe(`下载文件名，默认 ${DEFAULT_DESIGN_MD_FILENAME}`),
    }),
    execute: async ({ content, fileName }, { abortSignal }): Promise<SaveDesignMdResult> => {
      try {
        if (abortSignal?.aborted) {
          return { ok: false, error: '已中断' };
        }

        const asset = saveDesignDoc({ chatId, content, fileName });

        if (abortSignal?.aborted) {
          return { ok: false, error: '已中断' };
        }

        return {
          ok: true,
          assetId: asset.id,
          url: buildDocAssetUrl(asset.chatId, asset.id),
          fileName: asset.fileName,
          byteSize: asset.byteSize,
        };
      } catch (err) {
        if (abortSignal?.aborted) {
          return { ok: false, error: '已中断' };
        }
        console.error('[save_design_md]', err);
        return { ok: false, error: '文档保存失败，请稍后重试' };
      }
    },
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `DESIGN.md 保存失败：${output.error}` };
      }
      return {
        type: 'text',
        value: `DESIGN.md 已保存为 ${output.fileName}。界面会提供下载链接。请用一两句告知用户可以下载，不要在正文中粘贴文档全文、代码块或下载 URL。`,
      };
    },
  });
}

export const saveDesignMd: AgentToolDefinition = {
  id: 'save_design_md',
  create: ({ chatId }) => createSaveDesignMdTool(chatId),
  getHint: getSaveDesignMdHint,
};
