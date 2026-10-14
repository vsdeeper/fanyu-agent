import 'server-only';

import { z } from 'zod';
import { NOVEL_VOLUME_CHARS_MAX, NOVEL_VOLUME_CHARS_MIN } from '../_shared/constants';
import { isNovelIdeaFile, NOVEL_MAX_IDEA_FILES } from '../_shared/idea-file';
import { normalizeNovelPlan, parseSections } from '../_shared/normalize-plan';
import type {
  NovelCastRequest,
  NovelPlan,
  NovelPlanRequest,
  NovelPolishRequest,
  NovelResearchRequest,
  NovelVolumeChaptersRequest,
  NovelVolumesRequest,
  NovelWorldviewRequest,
  NovelWritingRequest,
} from '../_shared/types';

const ideaFileSchema = z
  .object({
    filename: z.string().trim().min(1),
    mediaType: z.string().trim().min(1),
    dataUrl: z.string().trim().startsWith('data:'),
  })
  .refine((value) => isNovelIdeaFile(value.filename, value.mediaType));

/** 世界观设定附件：必填，最多三份。 */
const ideaSourceSchema = {
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
  gender: z.enum(['female', 'male']),
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

/** 收成指定类型；形状不对时让整份请求失败。旧方案的分卷在这里被收成一级标题。 */
function zodNormalize<T>(parse: (value: unknown) => T | null) {
  return z.unknown().transform((value, ctx): T => {
    const parsed = parse(value);
    if (!parsed) {
      ctx.addIssue({ code: 'custom', message: 'invalid' });
      return z.NEVER;
    }
    return parsed;
  });
}

const planSchema = zodNormalize<NovelPlan>(normalizeNovelPlan);

/** 每卷字数：左栏填的数，越界或不是整数直接让请求失败。 */
const volumeCharsSchema = z.number().int().min(NOVEL_VOLUME_CHARS_MIN).max(NOVEL_VOLUME_CHARS_MAX);

/** 两级章节：缺省收成空数组，形状不对的条目丢掉。 */
const sectionsSchema = z
  .unknown()
  .optional()
  .transform((value) => parseSections(value));

const beatSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim(),
  event: z.string().trim(),
  characterIds: z.array(z.string().trim().min(1)),
});

const volumeSchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim(),
  sourceSectionId: optionalText,
  conflict: z.string().trim(),
  hook: z.string().trim(),
  beats: z.array(beatSchema),
});

const worldviewRequestSchema = z.object({
  ...ideaSourceSchema,
});

const researchSchema = z.object({
  worldview: sectionsSchema,
  planFile: ideaFileSchema.optional(),
  genres: z.array(z.string().trim().min(1)).optional(),
});

const planRequestSchema = z.object({
  worldview: sectionsSchema,
  planFile: ideaFileSchema.optional(),
  genres: z.array(z.string().trim().min(1)).optional(),
  topic: topicSchema,
  volumeChars: volumeCharsSchema,
});

const castRequestSchema = z.object({
  worldview: sectionsSchema,
  topic: topicSchema,
  plan: planSchema,
});

const volumesRequestSchema = z.object({
  worldview: sectionsSchema,
  topic: topicSchema,
  plan: planSchema,
  cast: castSchema,
  volumeChars: volumeCharsSchema,
});

const volumeChaptersSchema = z.object({
  worldview: sectionsSchema,
  topic: topicSchema,
  plan: planSchema,
  cast: castSchema,
  volume: volumeSchema,
  siblingVolumes: z.array(volumeSchema).optional(),
});

const chapterCardSchema = z.object({
  title: z.string().trim().min(1),
  scene: z.string().trim().min(1),
  event: z.string().trim().min(1),
  hook: z.string().trim().min(1),
});

const writingSchema = z.object({
  unitId: z.string().trim().min(1),
  worldview: sectionsSchema,
  topic: topicSchema,
  plan: planSchema,
  cast: castSchema,
  stylePrompt: z.string().trim().min(1).optional(),
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

/** 解析世界观设定请求体；失败返回 null。 */
export function parseWorldviewBody(json: unknown): NovelWorldviewRequest | null {
  const parsed = worldviewRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析选题调研请求体；失败返回 null。创作方案文件最多一份。 */
export function parseResearchBody(json: unknown): NovelResearchRequest | null {
  const parsed = researchSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析创作方案请求体；失败返回 null。 */
export function parsePlanBody(json: unknown): NovelPlanRequest | null {
  const parsed = planRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析角色设定请求体；失败返回 null。 */
export function parseCastBody(json: unknown): NovelCastRequest | null {
  const parsed = castRequestSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** 解析卷纲请求体；失败返回 null。 */
export function parseVolumesBody(json: unknown): NovelVolumesRequest | null {
  const parsed = volumesRequestSchema.safeParse(json);
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
