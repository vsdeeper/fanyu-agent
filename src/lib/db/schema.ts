import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  /** 多轮改图默认源图；edit 未传 sourceAssetIds 时使用 */
  workingImageAssetId: text('working_image_asset_id'),
});

export const imageAssets = sqliteTable('image_assets', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  parentId: text('parent_id'),
  modelId: text('model_id').notNull(),
  prompt: text('prompt').notNull(),
  fileName: text('file_name').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: text('created_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id')
    .notNull()
    .references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  ord: integer('ord').notNull(),
  /** 完整 UIMessage JSON，避免拆 parts 丢 reasoning / source-url 等字段 */
  data: text('data').notNull(),
});
