/**
 * Drop the local PGlite data dir and re-apply migrations from scratch.
 * Usage: pnpm --filter @yougrep/db reset
 */
import { rmSync } from 'node:fs';
import { getEnv } from '@yougrep/config';
import { ensureMigrated } from '../client';

async function main() {
  const env = getEnv();
  rmSync(env.PGLITE_DATA_DIR, { recursive: true, force: true });
  console.log(`[db:reset] cleared ${env.PGLITE_DATA_DIR}`);
  await ensureMigrated();
  console.log('[db:reset] migrations applied. Fresh database ready.');
  process.exit(0);
}

main().catch((err) => {
  console.error('[db:reset] failed', err);
  process.exit(1);
});
