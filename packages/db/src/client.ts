import { mkdirSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { getEnv } from '@yougrep/config';
import { schema } from './schema';
import { INIT_SQL } from './migrations.generated';

export type Database = PgliteDatabase<typeof schema>;

/**
 * The web app is a single Node process that owns the PGlite file. We stash the
 * client on globalThis so Next.js HMR doesn't open a second handle to the same
 * data dir (PGlite is single-connection).
 */
type DbGlobal = {
  __yougrep_pglite?: PGlite;
  __yougrep_db?: Database;
  __yougrep_migrated?: Promise<void>;
};
const g = globalThis as unknown as DbGlobal;

function getPglite(): PGlite {
  if (!g.__yougrep_pglite) {
    const env = getEnv();
    // PGlite's own mkdir is non-recursive; make sure the dir tree exists.
    mkdirSync(env.PGLITE_DATA_DIR, { recursive: true });
    g.__yougrep_pglite = new PGlite(env.PGLITE_DATA_DIR);
  }
  return g.__yougrep_pglite;
}

export function getDb(): Database {
  if (!g.__yougrep_db) {
    g.__yougrep_db = drizzle(getPglite(), { schema });
  }
  return g.__yougrep_db;
}

/**
 * Apply the embedded schema DDL exactly once per process, guarded so it is a
 * no-op when the schema already exists. Embedding the SQL (vs. the file-based
 * drizzle migrator) keeps this working under Next's server bundling, where
 * filesystem path resolution into the package is unreliable.
 */
export function ensureMigrated(): Promise<void> {
  if (!g.__yougrep_migrated) {
    g.__yougrep_migrated = (async () => {
      const client = getPglite();
      const res = await client.query<{ t: string | null }>(
        "select to_regclass('public.organization') as t",
      );
      const alreadyApplied = res.rows[0]?.t != null;
      if (!alreadyApplied) {
        await client.exec(INIT_SQL);
      }
    })();
  }
  return g.__yougrep_migrated;
}

/** For scripts/tests that need the raw PGlite handle. */
export function getRawClient(): PGlite {
  return getPglite();
}
