import 'server-only';

import { z } from 'zod';
import type { BusinessAnalysisAnalyzeRequest } from '../_shared/types';
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

const analyzeBodySchema = z
  .object({
    images: z.array(imageInputSchema).max(MAX_STUDIO_PRODUCT_IMAGES),
    documents: z.array(documentInputSchema).max(MAX_STUDIO_PRODUCT_DOCS).optional(),
    brandLogoDataUrl: z.string().startsWith('data:image/').optional(),
    productDescription: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    // 判空用 falsy 而非 === undefined：productDescription 经 .trim() 后，'   ' 会变成 ''
    const hasMaterial =
      value.images.length > 0 ||
      Boolean(value.brandLogoDataUrl) ||
      Boolean(value.productDescription) ||
      (value.documents?.length ?? 0) > 0;
    if (!hasMaterial) {
      context.addIssue({
        code: 'custom',
        path: ['images'],
        message: '产品精修图、品牌 Logo、产品说明与产品资料至少提供一项',
      });
    }
  });

/**
 * 校验分析请求体；失败返回 null。
 *
 * 这里的「至少一项」是宽松防呆，只看数组长度；真正的运行时判定在 handle-analyze 里，
 * 它还要看产品资料是否真的解析出了文本（坏文件不得充当素材）。
 */
export function parseAnalyzeBody(json: unknown): BusinessAnalysisAnalyzeRequest | null {
  const parsed = analyzeBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
