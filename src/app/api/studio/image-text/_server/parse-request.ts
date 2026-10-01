import 'server-only';

import { z } from 'zod';
import {
  IMAGE_TEXT_MAX_CONTENT_LENGTH,
  IMAGE_TEXT_MAX_DOCUMENTS,
  IMAGE_TEXT_MAX_MATERIALS,
} from '../_shared/constants';
import type { ImageTextPlanRequest } from '../_shared/types';
import { isAllowedImageTextDocument } from './document-guard';

const documentInputSchema = z
  .object({
    filename: z.string().min(1),
    mediaType: z.string().min(1),
    dataUrl: z.string().startsWith('data:'),
  })
  .refine((value) => isAllowedImageTextDocument(value.filename, value.mediaType));

const planBodySchema = z
  .object({
    materialDataUrls: z
      .array(z.string().startsWith('data:image/'))
      .max(IMAGE_TEXT_MAX_MATERIALS)
      .optional()
      .default([]),
    documents: z.array(documentInputSchema).max(IMAGE_TEXT_MAX_DOCUMENTS).optional(),
    content: z.string().trim().max(IMAGE_TEXT_MAX_CONTENT_LENGTH).optional(),
  })
  .refine(
    (data) =>
      data.materialDataUrls.length > 0 ||
      (data.documents?.length ?? 0) > 0 ||
      Boolean(data.content?.trim()),
  );

/** 校验图文内容请求体；失败返回 null。 */
export function parsePlanBody(json: unknown): ImageTextPlanRequest | null {
  const parsed = planBodySchema.safeParse(json);
  if (!parsed.success) return null;
  const content = parsed.data.content?.trim();
  const documents = parsed.data.documents;
  return {
    materialDataUrls: parsed.data.materialDataUrls,
    ...(documents?.length ? { documents } : {}),
    ...(content ? { content } : {}),
  };
}
