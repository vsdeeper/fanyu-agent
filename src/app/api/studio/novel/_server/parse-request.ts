import 'server-only';

import { z } from 'zod';
import { isNovelIdeaFile, NOVEL_MAX_IDEA_FILES } from '../_shared/idea-file';
import type {
  NovelCastRequest,
  NovelPlanRequest,
  NovelPolishRequest,
  NovelResearchRequest,
  NovelVolumeChaptersRequest,
  NovelWritingRequest,
} from '../_shared/types';

const ideaFileSchema = z
  .object({
    filename: z.string().trim().min(1),
    mediaType: z.string().trim().min(1),
    dataUrl: z.string().trim().startsWith('data:'),
  })
  .refine((value) => isNovelIdeaFile(value.filename, value.mediaType));

/** 想法可选。体系设定必填，最多三份。 */
const ideaSourceSchema = {
  idea: z.string().trim().min(1).optional(),
  ideaFiles: z.array(ideaFileSchema).min(1).max(NOVEL_MAX_IDEA_FILES),
};

const optionalText = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
  z.string().trim().min(1).optional(),
);

const topicSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  genreVolume: z.string().trim().min(1),
  why: z.string().trim().min(1),
  core: z.string().trim().min(1),
  risk: z.string().trim().optional(),
});

const arcSchema = z
  .object({
    early: optionalText,
    mid: optionalText,
    late: optionalText,
    end: optionalText,
  })
  .optional();

const characterSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  role: z.enum(['protagonist', 'antagonist', 'supporting']),
  gender: z.enum(['female', 'male', 'unspecified']),
  origin: z.string().trim().min(1),
  trait: z.string().trim().min(1),
  arc: arcSchema,
});

const relationArcSchema = z
  .object({
    early: optionalText,
    mid: optionalText,
    late: optionalText,
  })
  .optional();

const relationSchema = z.object({
  fromId: z.string().trim().min(1),
  toId: z.string().trim().min(1),
  label: z.string().trim().min(1),
  arc: relationArcSchema,
});

const castSchema = z.object({
  characters: z.array(characterSchema).min(1),
  relations: z.array(relationSchema),
});

const advanceSchema = z.object({
  volumeId: z.string().trim().min(1),
  text: z.string().trim().min(1),
});

const threadSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  core: z.string().trim().min(1),
  advances: z.array(advanceSchema),
});

const volumeOutlineSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1),
  geography: z.string().trim().min(1),
  conflict: z.string().trim().min(1),
  outcome: optionalText,
  targetChars: z.number().int().positive(),
});

const planSchema = z.object({
  threads: z.array(threadSchema).min(1),
  volumes: z.array(volumeOutlineSchema).min(1),
});

const researchSchema = z.object({
  ...ideaSourceSchema,
  planFile: ideaFileSchema.optional(),
  genres: z.array(z.string().trim().min(1)).optional(),
});

const planRequestSchema = z.object({
  ...ideaSourceSchema,
  planFile: ideaFileSchema.optional(),
  genres: z.array(z.string().trim().min(1)).optional(),
  topic: topicSchema,
});

const castRequestSchema = z.object({
  ...ideaSourceSchema,
  planFile: ideaFileSchema.optional(),
  genres: z.array(z.string().trim().min(1)).optional(),
  topic: topicSchema,
  plan: planSchema,
});

const volumeChaptersSchema = z.object({
  topic: topicSchema,
  plan: planSchema,
  cast: castSchema,
  ideaFiles: z.array(ideaFileSchema).min(1).max(NOVEL_MAX_IDEA_FILES),
  planFile: ideaFileSchema.optional(),
  volume: volumeOutlineSchema,
  siblingVolumes: z.array(volumeOutlineSchema).optional(),
});

const chapterCardSchema = z.object({
  title: z.string().trim().min(1),
  scene: z.string().trim().min(1),
  event: z.string().trim().min(1),
  hook: z.string().trim().min(1),
});

const writingSchema = z.object({
  unitId: z.string().trim().min(1),
  topic: topicSchema,
  plan: planSchema,
  cast: castSchema,
  stylePrompt: z.string().trim().min(1).optional(),
  tense: z.enum(['past', 'present']),
  previousChapters: z.array(
    chapterCardSchema.extend({
      body: z.string().optional(),
    }),
  ),
  chapter: chapterCardSchema,
  nextChapter: z
    .object({
      title: z.string().trim().min(1),
      hook: z.string().trim().min(1),
    })
    .optional(),
});

const polishSchema = z.object({
  body: z.string().trim().min(1),
  label: z.string().trim().min(1).optional(),
  scene: z.string().trim().min(1).optional(),
  event: z.string().trim().min(1).optional(),
  hook: z.string().trim().min(1).optional(),
  stylePrompt: z.string().trim().min(1).optional(),
});

/** 解析选题调研请求体；失败返回 null。 */
export function parseResearchBody(json: unknown): NovelResearchRequest | null {
  const parsed = researchSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析创作方案请求体；失败返回 null。创作方案文件最多一份。 */
export function parsePlanBody(json: unknown): NovelPlanRequest | null {
  const parsed = planRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析角色设定请求体；失败返回 null。 */
export function parseCastBody(json: unknown): NovelCastRequest | null {
  const parsed = castRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析按卷章卡请求体；失败返回 null。 */
export function parseVolumeChaptersBody(json: unknown): NovelVolumeChaptersRequest | null {
  const parsed = volumeChaptersSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析正文写作请求体；失败返回 null。 */
export function parseWritingBody(json: unknown): NovelWritingRequest | null {
  const parsed = writingSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析整章通顺润色请求体；失败返回 null。 */
export function parsePolishBody(json: unknown): NovelPolishRequest | null {
  const parsed = polishSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}
