import { defineConfig } from 'drizzle-kit';
import { resolveChatsDbPath } from './src/lib/db/paths';
import { loadEnvLocal, requireEnv } from './src/lib/shared/server/env';

// drizzle-kit 不加载 Next 的 .env.local，须先补进 process.env
loadEnvLocal();

const storeDir = requireEnv('CHAT_STORE_DIR');

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  dbCredentials: {
    url: resolveChatsDbPath(storeDir),
  },
});
