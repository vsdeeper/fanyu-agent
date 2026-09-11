import 'server-only';

import { z } from 'zod';
import type { BusinessAnalysisDocumentInput } from '@/app/api/studio/business-analysis/_shared/types';
import { MAX_STUDIO_PRODUCT_DOCS } from '@/app/api/studio/_server/constants';
import { isAllowedStudioDocument } from '@/app/api/studio/business-analysis/_server/document-guard';

const documentInputSchema = z
  .object({
    filename: z.string().min(1),
    mediaType: z.string().min(1),
    dataUrl: z.string().startsWith('data:'),
  })
  .refine((value) => isAllowedStudioDocument(value.filename, value.mediaType));

const analyzeKindSchema = z.enum(['mainImage', 'detailImage']);

const analyzeBodySchema = z
  .object({
    kind: analyzeKindSchema.optional().default('mainImage'),
    // 主图允许空数组（商业分析非必填），改由下方 superRefine 按 kind 判「至少一项」；详情图仍必须有文档
    documents: z.array(documentInputSchema).max(MAX_STUDIO_PRODUCT_DOCS).default([]),
    // 主图 / 详情图任务的补充产品资料；documents 恒为商业分析文档，两组不可混用
    productDocuments: z.array(documentInputSchema).max(MAX_STUDIO_PRODUCT_DOCS).optional(),
    /** 主图说明自由文本；仅主图，与商业分析至少一项非空 */
    mainImageDescription: z.string().trim().optional(),
    /**
     * 品牌 Logo 原图（仅主图，至多一张）：服务端先经 analyzeImage 转成中文描述再进分析。
     * 分析用的主模型在缺省 provider 下看不见像素，故这里只作识图入参，不直接喂给 streamText。
     */
    brandLogoDataUrl: z.string().startsWith('data:image/').optional(),
  })
  .superRefine((value, context) => {
    if (value.kind === 'detailImage') {
      if (value.documents.length === 0) {
        context.addIssue({
          code: 'custom',
          path: ['documents'],
          message: '详情图必须上传商业分析',
        });
      }
      return;
    }
    if (value.documents.length === 0 && !value.mainImageDescription) {
      context.addIssue({
        code: 'custom',
        path: ['documents'],
        message: '商业分析与主图说明至少填写一项',
      });
    }
  });

export type EcommerceAnalyzeKind = z.infer<typeof analyzeKindSchema>;

export type EcommerceAnalyzeRequest = {
  kind: EcommerceAnalyzeKind;
  documents: BusinessAnalysisDocumentInput[];
  productDocuments?: BusinessAnalysisDocumentInput[];
  mainImageDescription?: string;
  brandLogoDataUrl?: string;
};

/** 校验电商规划分析请求体；失败返回 null */
export function parseEcommerceAnalyzeBody(json: unknown): EcommerceAnalyzeRequest | null {
  const parsed = analyzeBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
