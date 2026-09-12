import 'server-only';

import { z } from 'zod';
import type { StudioGenerateRequest } from '../_shared/generate-types';
import {
  MAX_STUDIO_MODEL_IMAGES,
  MAX_STUDIO_PRODUCT_IMAGES,
  STUDIO_COUNT_VALUES,
} from './constants';

const specFieldsSchema = z.object({
  model: z.string().min(1),
  aspectRatio: z.string().min(1),
  quality: z.string().min(1),
  clarity: z.string().min(1),
  // 不是生成规格，而是本批占位槽 id（按出图清单顺序）；此处声明后各 kind 的 schema 才会保留它，
  // 否则 zod 会静默剥键。长度是否与出图清单一致由 handler 校验。
  slotIds: z.array(z.string().min(1)).optional(),
});

const imageInputSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.string().min(1),
  dataUrl: z.string().startsWith('data:image/'),
});

const imageDataUrlSchema = z.string().startsWith('data:image/');

const countSchema = z
  .number()
  .int()
  .refine((value) => (STUDIO_COUNT_VALUES as readonly number[]).includes(value));

const productRefineGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('productRefine'),
  count: z.literal(1),
  refineRequirement: z.string().trim().min(1),
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
});

const productMultiviewGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('productMultiview'),
  count: z.literal(1),
  multiviewRequirement: z.string().trim().min(1),
  refinedImageDataUrls: z.array(imageDataUrlSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
});

const productViewGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('productView'),
  count: countSchema,
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
});

const productModelGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('productModel'),
  count: countSchema,
  viewRequirement: z.string().trim().min(1),
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
  modelImages: z.array(imageInputSchema).max(MAX_STUDIO_MODEL_IMAGES).optional(),
});

const visualGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('visual'),
  count: z
    .number()
    .int()
    .refine((value) => (STUDIO_COUNT_VALUES as readonly number[]).includes(value)),
  analysisText: z.string().min(1),
  productViewImages: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
});

const mainImageGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('mainImage'),
  count: countSchema,
  analysisText: z.string().trim().min(1),
  brandLogoDataUrl: imageDataUrlSchema.optional(),
  productDocumentsText: z.string().optional(),
  requirements: z
    .array(
      z.object({
        themeId: z.string().trim().min(1),
        title: z.string().trim().min(1),
        requirement: z.string().trim().min(1),
      }),
    )
    .min(1),
  // 产品精修图非必填（可空数组）：没有参考图时生图侧自动降级为文生图
  productViewImages: z.array(imageInputSchema).max(MAX_STUDIO_PRODUCT_IMAGES),
  copyStyleReferenceDataUrl: imageDataUrlSchema.optional(),
});

const detailImageGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('detailImage'),
  count: countSchema,
  analysisText: z.string().trim().min(1),
  productDocumentsText: z.string().optional(),
  requirements: z
    .array(
      z.object({
        themeId: z.string().trim().min(1),
        title: z.string().trim().min(1),
        requirement: z.string().trim().min(1),
      }),
    )
    .min(1),
  productViewImages: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
  previousScreenDataUrl: imageDataUrlSchema.optional(),
});

const designGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('design'),
  count: countSchema,
  taskType: z.string().trim().min(1),
  includeModel: z.boolean(),
  analysisText: z.string().min(1),
  productViewImages: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
  visualDataUrl: imageDataUrlSchema,
  modelImages: z.array(imageInputSchema).max(MAX_STUDIO_MODEL_IMAGES).optional(),
});

const generateBodySchema = z
  .discriminatedUnion('kind', [
    productRefineGenerateSchema,
    productMultiviewGenerateSchema,
    productViewGenerateSchema,
    productModelGenerateSchema,
    visualGenerateSchema,
    designGenerateSchema,
    mainImageGenerateSchema,
    detailImageGenerateSchema,
  ])
  .superRefine((value, context) => {
    if (value.kind !== 'design') return;
    if (value.includeModel !== Boolean(value.modelImages?.length)) {
      context.addIssue({
        code: 'custom',
        path: ['modelImages'],
        message: '模特开关与参考图不一致',
      });
    }
  });

/** 校验生图请求体；失败返回 null */
export function parseGenerateBody(json: unknown): StudioGenerateRequest | null {
  const parsed = generateBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
