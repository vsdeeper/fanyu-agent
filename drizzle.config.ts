import { defineConfig } from 'drizzle-kit';
import { requireEnv } from './src/lib/shared/env';

const storeDir = requireEnv('CHAT_STORE_DIR');

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: `${storeDir.replace(/\/$/, '')}/chats.db`,
  },
});
