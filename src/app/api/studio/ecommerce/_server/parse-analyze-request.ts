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

const analyzeBodySchema = z.object({
  kind: analyzeKindSchema.optional().default('mainImage'),
  documents: z.array(documentInputSchema).min(1).max(MAX_STUDIO_PRODUCT_DOCS),
  // 主图 / 详情图任务的补充产品资料；documents 恒为商业分析文档，两组不可混用
  productDocuments: z.array(documentInputSchema).max(MAX_STUDIO_PRODUCT_DOCS).optional(),
});

export type EcommerceAnalyzeKind = z.infer<typeof analyzeKindSchema>;

export type EcommerceAnalyzeRequest = {
  kind: EcommerceAnalyzeKind;
  documents: BusinessAnalysisDocumentInput[];
  productDocuments?: BusinessAnalysisDocumentInput[];
};

/** 校验电商规划分析请求体；失败返回 null */
export function parseEcommerceAnalyzeBody(json: unknown): EcommerceAnalyzeRequest | null {
  const parsed = analyzeBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
