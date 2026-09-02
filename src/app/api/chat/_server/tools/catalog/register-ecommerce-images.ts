import { tool } from 'ai';
import { z } from 'zod';

import {
  saveLabeledUserUpload,
  type UserUploadRole,
} from '@/app/api/images/_server/product-assets';
import type { AgentToolDefinition } from '../types';

export type RegisterEcommerceImageItem = {
  index: number;
  role: UserUploadRole;
  assetId: string;
};

export type RegisterEcommerceImagesSuccess = {
  ok: true;
  assets: RegisterEcommerceImageItem[];
};

export type RegisterEcommerceImagesFailure = {
  ok: false;
  error: string;
};

export type RegisterEcommerceImagesResult =
  RegisterEcommerceImagesSuccess | RegisterEcommerceImagesFailure;

function getRegisterHint(): string {
  return `电商上传图登记工具使用规则：
- 仅电商设计：把用户粘贴/上传的图分类落盘为产品图（product，出图身份锚点）或设计参考图（reference，风格参考），供跨轮 sourceAssetIds / analyze_image 引用
- 按用户意图填写 items：index 为待登记图 0 基序号（与服务端【待登记上传图】提示一致），role 为 product 或 reference
- 用户明说商品/产品/主体/拍的实物 → product；明说参考/风格/版式/想做成这样 → reference；只贴一张且意图是出电商图、未说是参考 → product
- 多张且未分工：先问「哪张是产品图、哪张是设计参考」，在用户回答前不要调用本工具、不要 generate_image
- 意图仍不清时可先 analyze_image 辅助，仍不确定就问
- 登记成功后再出图；不要向用户展示、复述 assetId`;
}

/** 创建 register_ecommerce_images：按角色把待登记上传图落盘为哨兵资产。 */
function createRegisterEcommerceImagesTool(
  chatId: string,
  pendingUploadDataUrls: string[] | undefined,
  ecommerceUploadsEnabled: boolean | undefined,
) {
  return tool({
    description:
      '将用户上传图登记为电商产品图或设计参考图并落盘，供后续跨轮引用。仅电商设计流程、且已能按用户意图分类时调用；意图不明时先问用户。',
    inputSchema: z.object({
      items: z
        .array(
          z.object({
            index: z.number().int().min(0).describe('待登记图 0 基序号'),
            role: z
              .enum(['product', 'reference'])
              .describe('product=产品本体锚点；reference=设计风格参考'),
          }),
        )
        .min(1)
        .describe('要登记的每张图及其角色；同一张可只登记一次'),
    }),
    execute: async ({ items }, { abortSignal }): Promise<RegisterEcommerceImagesResult> => {
      if (!ecommerceUploadsEnabled) {
        return { ok: false, error: '当前不是电商设计流程，无法登记上传图' };
      }
      const urls = pendingUploadDataUrls ?? [];
      if (urls.length === 0) {
        return { ok: false, error: '没有可登记的上传图，请用户先粘贴产品图或参考图' };
      }

      const seen = new Set<number>();
      const assets: RegisterEcommerceImageItem[] = [];
      try {
        for (const item of items) {
          if (abortSignal?.aborted) {
            return { ok: false, error: '已中断' };
          }
          if (seen.has(item.index)) {
            continue;
          }
          seen.add(item.index);
          const dataUrl = urls[item.index];
          if (!dataUrl) {
            return { ok: false, error: `待登记图第 ${item.index + 1} 张不存在` };
          }
          const asset = await saveLabeledUserUpload(chatId, dataUrl, item.role);
          assets.push({ index: item.index, role: item.role, assetId: asset.id });
        }
        return { ok: true, assets };
      } catch (err) {
        if (abortSignal?.aborted) {
          return { ok: false, error: '已中断' };
        }
        console.error('[register_ecommerce_images]', err);
        return { ok: false, error: '上传图登记失败，请稍后重试' };
      }
    },
    toModelOutput: ({ output }) => {
      if (!output.ok) {
        return { type: 'text', value: `上传图登记失败：${output.error}` };
      }
      const productIds = output.assets
        .filter((item) => item.role === 'product')
        .map((item) => item.assetId);
      const referenceIds = output.assets
        .filter((item) => item.role === 'reference')
        .map((item) => item.assetId);
      const parts: string[] = [`已登记 ${output.assets.length} 张上传图。`];
      if (productIds.length) {
        parts.push(
          `产品图 assetId（${productIds.join('、')}）仅供后续 generate_image 的 sourceAssetIds 首位或 analyze_image；不要向用户展示。`,
        );
      }
      if (referenceIds.length) {
        parts.push(
          `参考图 assetId（${referenceIds.join('、')}）仅供风格参考放入 sourceAssetIds（排在产品图之后）；不要向用户展示。`,
        );
      }
      return { type: 'text', value: parts.join('') };
    },
  });
}

export const registerEcommerceImages: AgentToolDefinition = {
  id: 'register_ecommerce_images',
  requiresEcommerceUploads: true,
  create: ({ chatId, pendingUploadDataUrls, ecommerceUploadsEnabled }) =>
    createRegisterEcommerceImagesTool(chatId, pendingUploadDataUrls, ecommerceUploadsEnabled),
  getHint: getRegisterHint,
};
