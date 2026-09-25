import 'server-only';

import { z } from 'zod';
import type {
  NovelChapterBeatsRequest,
  NovelResearchRequest,
  NovelStructureRequest,
  NovelVolumeChaptersRequest,
  NovelWritingRequest,
} from '../_shared/types';

const volumeSchema = z.enum(['short', 'medium', 'long']);
const longFormatSchema = z.enum(['publish', 'web']);

const topicSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  genreVolume: z.string().trim().min(1),
  why: z.string().trim().min(1),
  core: z.string().trim().min(1),
  risk: z.string().trim().optional(),
});

const researchSchema = z.object({
  idea: z.string().trim().min(1),
  genres: z.array(z.string().trim().min(1)).optional(),
  volume: volumeSchema,
  longFormat: longFormatSchema.optional(),
});

const structureSchema = z.object({
  idea: z.string().trim().min(1),
  genres: z.array(z.string().trim().min(1)).optional(),
  volume: volumeSchema,
  longFormat: longFormatSchema.optional(),
  topic: topicSchema,
});

const volumeChaptersSchema = z.object({
  topic: topicSchema,
  longFormat: longFormatSchema.optional(),
  volume: z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
  }),
  siblingVolumes: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        title: z.string().trim().min(1),
        purpose: z.string().trim().min(1),
      }),
    )
    .optional(),
  existingChapterCount: z.number().int().min(0).optional(),
});

const chapterBeatsSchema = z.object({
  topic: topicSchema,
  longFormat: longFormatSchema.optional(),
  chapter: z.object({
    id: z.string().trim().min(1),
    title: z.string().trim().min(1),
    purpose: z.string().trim().min(1),
  }),
  siblingChapters: z
    .array(
      z.object({
        id: z.string().trim().min(1),
        title: z.string().trim().min(1),
        purpose: z.string().trim().min(1),
      }),
    )
    .optional(),
});

const writingSchema = z.object({
  unitId: z.string().trim().min(1),
  beatText: z.string().trim().min(1),
  chapterTitle: z.string().trim().min(1).optional(),
  chapterPurpose: z.string().trim().min(1).optional(),
  topic: topicSchema,
  volume: volumeSchema,
  longFormat: longFormatSchema.optional(),
  stylePrompt: z.string().trim().min(1).optional(),
});

/** 解析选题调研请求体；失败返回 null。 */
export function parseResearchBody(json: unknown): NovelResearchRequest | null {
  const parsed = researchSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析故事结构请求体；失败返回 null。 */
export function parseStructureBody(json: unknown): NovelStructureRequest | null {
  const parsed = structureSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析按卷章纲请求体；失败返回 null。 */
export function parseVolumeChaptersBody(json: unknown): NovelVolumeChaptersRequest | null {
  const parsed = volumeChaptersSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析章内节拍请求体；失败返回 null。 */
export function parseChapterBeatsBody(json: unknown): NovelChapterBeatsRequest | null {
  const parsed = chapterBeatsSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析正文写作请求体；失败返回 null。 */
export function parseWritingBody(json: unknown): NovelWritingRequest | null {
  const parsed = writingSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
