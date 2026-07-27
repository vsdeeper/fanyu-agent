import { defineConfig } from 'drizzle-kit';

const storeDir = process.env.CHAT_STORE_DIR?.trim() || 'D:/华为云盘/ai-agent/chats';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `${storeDir.replace(/\/$/, '')}/chats.db`,
  },
});
