import 'server-only';

import { z } from 'zod';

import type {
  EcommerceAnalyzeRequest,
  EcommerceGenerateRequest,
  EcommercePlanSlot,
} from '@/app/api/ecommerce/_shared/types';
import { MAX_STUDIO_PRODUCT_IMAGES, STUDIO_COUNT_VALUES } from './constants';

const formFieldsSchema = z.object({
  designType: z.enum(['main', 'detail', 'ad']),
  platform: z.string().min(1),
  requirement: z.string(),
  language: z.string().min(1),
  model: z.string().min(1),
  aspectRatio: z.string().min(1),
  quality: z.string().min(1),
  clarity: z.string().min(1),
  count: z
    .number()
    .int()
    .refine((value) => (STUDIO_COUNT_VALUES as readonly number[]).includes(value)),
});

const imageInputSchema = z.object({
  filename: z.string().min(1),
  mediaType: z.string().min(1),
  dataUrl: z.string().startsWith('data:image/'),
});

const analyzeBodySchema = formFieldsSchema.extend({
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
});

const planSlotSchema = z.object({
  index: z.number().int(),
  title: z.string(),
  marketing: z.string(),
  visual: z.string(),
  copy: z.string(),
  prompt: z.string().min(1),
});

const generateBodySchema = formFieldsSchema.extend({
  images: z.array(imageInputSchema).min(1).max(MAX_STUDIO_PRODUCT_IMAGES),
  slots: z.array(planSlotSchema).min(1),
});

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

/** 校验模型输出的 slots 数组 */
export function parsePlanSlots(value: unknown): EcommercePlanSlot[] | null {
  const parsed = z.array(planSlotSchema).min(1).safeParse(value);
  return parsed.success ? parsed.data : null;
}
