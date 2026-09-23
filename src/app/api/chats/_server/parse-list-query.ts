import 'server-only';

import { z } from 'zod';

const MAX_TITLE_LENGTH = 100;
const MAX_BATCH_DELETE_IDS = 2000;

const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: 'invalid datetime',
});

const listQuerySchema = z.object({
  title: z.string().trim().max(MAX_TITLE_LENGTH).optional(),
  createdFrom: isoDateTime.optional(),
  createdTo: isoDateTime.optional(),
});

const batchDeleteSchema = z.strictObject({
  ids: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(MAX_BATCH_DELETE_IDS)
    .transform((ids) => [...new Set(ids)]),
});

export type ChatListQuery = {
  title?: string;
  createdFrom?: string;
  createdTo?: string;
};

/** 解析对话管理列表查询参数（标题、创建日期范围）。 */
export function parseChatListQuery(url: string): ChatListQuery {
  const params = new URL(url).searchParams;
  return listQuerySchema.parse({
    title: params.get('title') || undefined,
    createdFrom: params.get('createdFrom') || undefined,
    createdTo: params.get('createdTo') || undefined,
  });
}

/** 解析批量删除请求体。 */
export function parseBatchDeleteRequest(value: unknown): { ids: string[] } {
  return batchDeleteSchema.parse(value);
}
