import 'server-only';

import { z } from 'zod';
import type { EcommerceAnalyzeRequest } from '../_shared/types';
import {
  MAX_STUDIO_PRODUCT_DOCS,
  MAX_STUDIO_PRODUCT_IMAGES,
} from '@/app/api/studio/_server/constants';
import { isAllowedStudioDocument } from './document-guard';

const imageInputSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.string().min(1),
  dataUrl: z.string().startsWith('data:image/'),
});

const documentInputSchema = z
  .object({
    filename: z.string().min(1),
    mediaType: z.string().min(1),
    dataUrl: z.string().startsWith('data:'),
  })
  .refine((value) => isAllowedStudioDocument(value.filename, value.mediaType));

const analyzeBodySchema = z.object({
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
  documents: z.array(documentInputSchema).max(MAX_STUDIO_PRODUCT_DOCS).optional(),
});

/** 校验分析请求体；失败返回 null */
export function parseAnalyzeBody(json: unknown): EcommerceAnalyzeRequest | null {
  const parsed = analyzeBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
