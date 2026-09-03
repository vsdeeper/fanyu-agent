import 'server-only';

import { z } from 'zod';

import type {
  EcommerceAnalyzeRequest,
  EcommerceGenerateRequest,
  EcommerceModelHelpWriteRequest,
} from '@/app/api/ecommerce/_shared/types';
import {
  MAX_STUDIO_MODEL_IMAGES,
  MAX_STUDIO_PRODUCT_DOCS,
  MAX_STUDIO_PRODUCT_IMAGES,
  STUDIO_COUNT_VALUES,
} from './constants';
import { isAllowedStudioDocument } from './document-guard';

const specFieldsSchema = z.object({
  model: z.string().min(1),
  aspectRatio: z.string().min(1),
  quality: z.string().min(1),
  clarity: z.string().min(1),
});

const imageInputSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.string().min(1),
  dataUrl: z.string().startsWith('data:image/'),
});

const imageDataUrlSchema = z.string().startsWith('data:image/');

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

const visualGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('visual'),
  count: z
    .number()
    .int()
    .refine((value) => (STUDIO_COUNT_VALUES as readonly number[]).includes(value)),
  analysisText: z.string().min(1),
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
});

const modelGenerateSchema = specFieldsSchema.extend({
  kind: z.literal('model'),
  modelRequirement: z.string(),
  visualDataUrl: imageDataUrlSchema,
  modelImages: z.array(imageInputSchema).max(MAX_STUDIO_MODEL_IMAGES).optional(),
});

const modelHelpWriteBodySchema = z.object({
  analysisText: z.string().min(1),
  visualDataUrl: imageDataUrlSchema,
  modelImageDataUrl: imageDataUrlSchema.optional(),
});

const generateBodySchema = z.discriminatedUnion('kind', [
  visualGenerateSchema,
  modelGenerateSchema,
]);

/** 校验分析请求体；失败返回 null */
export function parseAnalyzeBody(json: unknown): EcommerceAnalyzeRequest | null {
  const parsed = analyzeBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 校验生图请求体；失败返回 null */
export function parseGenerateBody(json: unknown): EcommerceGenerateRequest | null {
  const parsed = generateBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 校验模特要求帮写请求体；失败返回 null */
export function parseModelHelpWriteBody(json: unknown): EcommerceModelHelpWriteRequest | null {
  const parsed = modelHelpWriteBodySchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
