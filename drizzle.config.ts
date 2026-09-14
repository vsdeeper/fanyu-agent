import { defineConfig } from 'drizzle-kit';
import { requireEnv } from './src/lib/shared/server/env';
import { resolveChatsDbPath } from './src/lib/db/paths';

const storeDir = requireEnv('CHAT_STORE_DIR');

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolveChatsDbPath(storeDir),
  },
});
