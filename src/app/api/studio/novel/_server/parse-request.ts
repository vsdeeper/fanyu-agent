import 'server-only';

import { z } from 'zod';
import { isNovelIdeaFile } from '../_shared/idea-file';
import type {
  NovelBibleRequest,
  NovelChapterBeatsRequest,
  NovelPolishRequest,
  NovelResearchRequest,
  NovelStructureRequest,
  NovelVolumeChaptersRequest,
  NovelWritingRequest,
} from '../_shared/types';

const volumeSchema = z.enum(['short', 'medium', 'long']);
const longFormatSchema = z.enum(['publish', 'web']);

const ideaFileSchema = z
  .object({
    filename: z.string().trim().min(1),
    mediaType: z.string().trim().min(1),
    dataUrl: z.string().trim().startsWith('data:'),
  })
  .refine((value) => isNovelIdeaFile(value.filename, value.mediaType));

/** 想法正文与思路文件至少有一项。空字符串过不了 min(1)，调用方应省略该字段。 */
const ideaSourceSchema = {
  idea: z.string().trim().min(1).optional(),
  ideaFile: ideaFileSchema.optional(),
};

function hasIdeaSource(data: { idea?: string; ideaFile?: unknown }): boolean {
  return Boolean(data.idea) || Boolean(data.ideaFile);
}

const topicSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  genreVolume: z.string().trim().min(1),
  why: z.string().trim().min(1),
  core: z.string().trim().min(1),
  risk: z.string().trim().optional(),
});

const researchSchema = z
  .object({
    ...ideaSourceSchema,
    genres: z.array(z.string().trim().min(1)).optional(),
    volume: volumeSchema,
    longFormat: longFormatSchema.optional(),
  })
  .refine(hasIdeaSource);

const characterSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting']),
  gender: z.enum(['female', 'male', 'unspecified']),
  identity: z.string().trim().min(1),
  desire: z.string().trim().min(1),
  flaw: z.string().trim().min(1),
});

const relationSchema = z.object({
  fromId: z.string().trim().min(1),
  toId: z.string().trim().min(1),
  label: z.string().trim().min(1),
});

const bibleSchema = z.object({
  characters: z.array(characterSchema).min(1),
  relations: z.array(relationSchema),
  timePlace: z.string().trim().min(1),
  rules: z.array(z.string().trim().min(1)),
  taboos: z.array(z.string().trim().min(1)).optional(),
  tense: z.enum(['past', 'present']),
  voicePrompt: z.string().trim().min(1),
});

const bibleRequestSchema = z
  .object({
    ...ideaSourceSchema,
    genres: z.array(z.string().trim().min(1)).optional(),
    volume: volumeSchema,
    longFormat: longFormatSchema.optional(),
    topic: topicSchema,
  })
  .refine(hasIdeaSource);

const structureSchema = z
  .object({
    ...ideaSourceSchema,
    genres: z.array(z.string().trim().min(1)).optional(),
    volume: volumeSchema,
    longFormat: longFormatSchema.optional(),
    topic: topicSchema,
    bible: bibleSchema,
  })
  .refine(hasIdeaSource);

const volumeChaptersSchema = z.object({
  topic: topicSchema,
  bible: bibleSchema,
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
  bible: bibleSchema,
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

const polishSchema = z.object({
  body: z.string().trim().min(1),
  beatText: z.string().trim().min(1).optional(),
  stylePrompt: z.string().trim().min(1).optional(),
});

const writingSchema = z.object({
  unitId: z.string().trim().min(1),
  beatText: z.string().trim().min(1),
  chapterTitle: z.string().trim().min(1).optional(),
  chapterPurpose: z.string().trim().min(1).optional(),
  topic: topicSchema,
  bible: bibleSchema,
  volume: volumeSchema,
  longFormat: longFormatSchema.optional(),
  stylePrompt: z.string().trim().min(1).optional(),
});

/** 解析设定生成请求体；失败返回 null。 */
export function parseBibleBody(json: unknown): NovelBibleRequest | null {
  const parsed = bibleRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

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

/** 解析单节拍通顺润色请求体；失败返回 null。 */
export function parsePolishBody(json: unknown): NovelPolishRequest | null {
  const parsed = polishSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
