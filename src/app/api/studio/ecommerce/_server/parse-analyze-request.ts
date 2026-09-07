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

const analyzeBodySchema = z.object({
  documents: z.array(documentInputSchema).min(1).max(MAX_STUDIO_PRODUCT_DOCS),
});

export type EcommerceMainImageAnalyzeRequest = {
  documents: BusinessAnalysisDocumentInput[];
};

/** 校验主图分析请求体；失败返回 null */
export function parseMainImageAnalyzeBody(json: unknown): EcommerceMainImageAnalyzeRequest | null {
  const parsed = analyzeBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
